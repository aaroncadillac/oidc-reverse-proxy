import Ajv from "ajv"
const ajv = new Ajv()

const schema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      issuer: { type: "string" },
      client_id: { type: "string" },
      client_secret: { type: "string" },
      session_cookie_secret: { type: "string" },
      on_unauthenticated_request: { type: "string" },
      scope: { type: "string" },
      session_cookie_name: { type: "string" },
      email_domains: { type: "array", items: { type: "string" } },
      paths: {
        type: "object",
        additionalProperties: {
          type: "object",
          properties: {
            upstream: { type: "string" },
            healthcheck: { type: "string" }
          },
          required: ["upstream"],
          additionalProperties: false
        }
      }
    },
    required: ["issuer", "client_id", "client_secret", "paths", "session_cookie_secret"],
    additionalProperties: false
  },
  minItems: 1
}

const verifyJSON = (json) => {
  try {
    const valid = ajv.validate(schema, json)
    if (!valid) {
      throw ajv.errors?.[0]?.message 
    }
  } catch (error) {
    console.error('Config file is not valid:', error)
    process.exit(1)
  }
}

export { verifyJSON }
