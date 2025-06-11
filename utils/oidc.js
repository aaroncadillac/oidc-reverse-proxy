import * as client from 'openid-client'

const code_challenge_method = 'S256'

const initAuthFlow = async (redirect_uri, config, request) => {
  try {
    const oidcConfig = await client.discovery(new URL(config.issuer), config.client_id, config.client_secret);
    const code_verifier = client.randomPKCECodeVerifier()
    const code_challenge = await client.calculatePKCECodeChallenge(code_verifier)
    const parameters = {
      redirect_uri,
      scope: config.scope,
      code_challenge,
      code_challenge_method,
    }
    const state = client.randomState()

    parameters.state = state

    request.session.set('state', state)
    request.session.set('code_verifier', code_verifier)

    const redirectTo = client.buildAuthorizationUrl(oidcConfig, parameters)

    return redirectTo
  } catch (error) {
    console.error('Error starting auth flow', error)
  }
}

const verifyNGetToken = async (currentURL, config, request) => {
  try {
    const oidcConfig = await client.discovery(new URL(config.issuer), config.client_id, config.client_secret);
    const tokens = await client.authorizationCodeGrant(oidcConfig, new URL(currentURL), {
      pkceCodeVerifier: request.session.get('code_verifier'),
      expectedState: request.session.get('state'),
    })

    const { access_token } = tokens
    const claims = tokens.claims()

    request.session.set('user', {
      id: claims.sub,
      email: claims.email,
      name: claims.name
    })

    request.session.set('access_token', access_token)
    console.info('\x1b[90mAccess token stored\x1b[0m')

    return true
  } catch (error) {
    console.error('Error getting token', error)
  }

}

const getUserInfo = async (token, config, request) => {
  try {
    const oidcConfig = await client.discovery(new URL(config.issuer), config.client_id, config.client_secret);
    const userInfo = await client.fetchUserInfo(oidcConfig, token, request.session.get('user').id)
    return userInfo.hasOwnProperty('sub')
  } catch (error) {
    console.error('Error getting user info', error)
  }
}

export {
  initAuthFlow,
  verifyNGetToken,
  getUserInfo
}