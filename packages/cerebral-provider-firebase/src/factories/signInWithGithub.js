import {convertObjectWithTemplates} from './utils'

function signInWithGithubFactory (options = {}) {
  function signInWithGithub (context) {
    return context.firebase.signInWithGithub(convertObjectWithTemplates(options, context))
      .then(context.path.success)
      .catch(context.path.error)
  }

  return signInWithGithub
}

export default signInWithGithubFactory
