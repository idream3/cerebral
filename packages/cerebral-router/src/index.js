import urlMapper from 'url-mapper'
import Router from './router'

let addressbar
try {
  addressbar = require('addressbar')
} catch (e) {
  addressbar = {
    pathname: '/',
    value: '',
    origin: '',
    on () {},
    removeListener () {}
  }
}

export function redirect (url) {
  function redirect ({router}) {
    router.redirect(url)
  }

  return redirect
}

export function goTo (url) {
  function goTo ({router}) {
    router.goTo(url)
  }

  return goTo
}

export default function (options = {}) {
  const mapper = urlMapper({query: true})

  return ({controller, path}) => {
    if (path.length !== 1 || path[0] !== 'router') {
      throw new Error('Cerebral router must be attached as top level module named "router".')
    }

    return new Router(controller, addressbar, mapper, options)
  }
}
