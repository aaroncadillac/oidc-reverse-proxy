#!/usr/bin/env node

import sade from "sade";
import Fastify from "fastify";
import fastifyHttpProxy from "@fastify/http-proxy";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import pkg from "./package.json" with { type: "json" };
import { verifyJSON } from "./utils/schema-validator.js";
import { readConfigFile } from "./utils/config-file.js";
import { homedir } from "os";
import { getUserInfo, initAuthFlow, verifyNGetToken } from "./utils/oidc.js";
const fastify = Fastify({
  logger: true,
});

const prog = sade("oidc-rproxy");

prog
  .version(pkg.version)
  .option(
    "--host, -H,",
    "$OIDC_RPROXY_HOST Host to listen on",
    process.env.OIDC_RPROXY_HOST || "127.0.0.1",
  )
  .option(
    "--port, -p",
    "$OIDC_RPROXY_PORT Port to listen on",
    process.env.OIDC_RPROXY_PORT || 3000,
  )
  .option(
    "--config, -c",
    "Provide path to custom config",
    "~/oidc-rproxy.json",
  );

prog
  .command("run <public_uri>")
  .describe("Run the server")
  .example("run http://localhost:3000")
  .example("run https://public-uri.com")
  .example("run --host 0.0.0.0 --port 3000 --config custom.json")
  .action((public_uri, opts) => {
    const configPath = opts.config.replace("~", homedir);
    const fullConfig = readConfigFile(configPath);

    verifyJSON(fullConfig);

    fastify.register(fastifyCookie);

    for (const config of fullConfig) {
      fastify.register(fastifySession, {
        secret: config.session_cookie_secret,
        cookieName: config.session_cookie_name,
        cookie: { secure: "auto", sameSite: "strict" },
      });

      for (const [path, pathConfig] of Object.entries(config.paths)) {
        const upstream = pathConfig.upstream;
        const callbackPath = `${path}oidc/callback`;
        const redirectURI = `${public_uri}${callbackPath}`;

        if (pathConfig.healthcheck) {
          fastify.get(path + pathConfig.healthcheck, async (req, reply) => {
            const response = await fetch(pathConfig.upstream);
            reply.code(response.status).send({ status: response.ok });
          });
        }
        if (pathConfig.healthcheckRootPath) {
          fastify.get(pathConfig.healthcheckRootPath, async (req, reply) => {
            const response = await fetch(pathConfig.upstream);
            reply.code(response.status).send({ status: response.ok });
          });
        }
        if (path !== "/") {
          fastify.get(path.slice(0, -1), (req, reply) => {
            reply.redirect(path);
          });
        }

        fastify.get(callbackPath, async (req, reply) => {
          console.info("\x1b[90mAuth flow started\x1b[0m");
          const verifyURL = public_uri + req.url;
          await verifyNGetToken(verifyURL, config, req);
          console.info("\x1b[90mAuth flow finished\x1b[0m");
          reply.redirect(path);
        });

        fastify.register(fastifyHttpProxy, {
          upstream,
          prefix: path !== "/" ? path : undefined,
          rewritePrefix: "",
          http2: false,
          websocket: true,
          replyOptions: {
            rewriteHeaders: (headers) => {
              if (headers.location && headers.location.startsWith(".")) {
                headers.location = headers.location.replace(`.${path}`, "");
              }
              return headers;
            },
            rewriteRequestHeaders: (originalReq, headers) => ({
              ...headers,
              authorization: originalReq.session.get("access_token"),
            }),
          },
          preValidation: async (request, reply) => {
            const token = request.session.get("access_token");
            let userInfo = false;
            if (token) {
              userInfo = await getUserInfo(token, config, request);
            }
            if (!token || !userInfo) {
              const redirectTo = await initAuthFlow(
                redirectURI,
                config,
                request,
              );
              reply.redirect(redirectTo);
            }
          },
        });
      }
    }

    fastify.listen({ host: opts.host, port: opts.port });
  });

prog.parse(process.argv);
