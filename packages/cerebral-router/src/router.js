import {getRoutableSignals, flattenConfig, getPath} from './utils'
import {propsDiffer} from 'cerebral/lib/utils'
import {set} from 'cerebral/operators'

export default class Router {
  constructor (controller, addressbar, mapper, options) {
    this.controller = controller
    this.mapper = mapper
    this.options = options
    this.addressbar = addressbar

    this.provider = {
      router: {
        getUrl: this.getUrl.bind(this),
        setUrl: this.setUrl.bind(this),
        goTo: this.goTo.bind(this),
        redirect: this.redirect.bind(this)
      }
    }

    if (!options.baseUrl && options.onlyHash) {
      // autodetect baseUrl
      options.baseUrl = addressbar.pathname
    }
    options.baseUrl = (options.baseUrl || '') + (options.onlyHash ? '#' : '')

    controller.on('initialized', () => {
      this.routesConfig = flattenConfig(options.routes)
      this.routableSignals = getRoutableSignals(this.routesConfig, controller)

      addressbar.on('change', this.onUrlChange.bind(this))
      controller.runTree.on('start', this.onSignalStart.bind(this))
      controller.on('flush', this.onFlush.bind(this))

      if (!options.preventAutostart) {
        this.onUrlChange()
      }
    })
  }

  updateActiveRoute (url, flag) {
    const {match, route, values} = this.mapper.map(url, this.routesConfig) || {}

    if (match) {
      const {map} = match
      let input = this.activeRoute && this.activeRoute.input

      if (map && !flag) {
        // sets state mappings and transforms input for signal if any
        this.controller.runTree(
          'router.routed',
          Object.keys(map).map((key) => set(map[key], values[key] || null)),
          (_, __, payload) => {
            input = payload
          }
        )
      }

      this.activeRoute = Object.assign(match, {route, values, input})
    }

    return !!match
  }

  onUrlChange (event) {
    const url = this.getRoutablePart(event ? event.target.value : this.addressbar.value)
    const prevSignal = this.activeRoute
      ? {
        name: this.activeRoute.signal,
        input: Object.assign(this.activeRoute.input || {})
      }
      : null

    if (this.updateActiveRoute(url)) {
      const {signal, map, values, input} = this.activeRoute

      event && event.preventDefault()

      if (signal) {
        if (map && prevSignal && prevSignal.name === signal && !propsDiffer(input, prevSignal.input)) {
          // do not re run signal if input not changed
          return
        }

        console.log('start signal from url change')
        this.controller.getSignal(signal)(map ? input : values)
      }
    } else {
      if (this.options.allowEscape) return

      event && event.preventDefault()
      console.warn(`Cerebral router - No route matched ${url}, navigation was prevented. Please verify url or catch unmatched routes with a "/*" route.`) // eslint-disable-line no-console
    }
  }

  onSignalStart (execution, payload) {
    const signal = this.routableSignals[execution.name]
    if (signal) {
      const {route, map} = signal
      const ctx = {input: payload, state: {get: this.controller.getState.bind(this.controller)}}

      // resolve mappings on current input and state
      const url = this.mapper.stringify(
        route,
        map
          ? Object.keys(map || {}).reduce((resolved, key) => {
            const value = map[key](ctx).value

            if (this.options.filterFalsy && !value) {
              return resolved
            }

            resolved[key] = map[key](ctx).value
            return resolved
          }, {})
          : payload
      )

      this.setUrl(url)
      console.log('update on signal start')

      this.updateActiveRoute(url, true)
    }
  }

  onFlush (changed) {
    if (!this.activeRoute) {
      return
    }
    const {map, route, values} = this.activeRoute
    const ctx = {input: {}, state: {get: this.controller.getState.bind(this.controller)}}
    let shouldUpdate = false

    const resolvedMap = Object.keys(map || {}).reduce((resolved, key) => {
      const {target, path} = map[key](ctx)

      shouldUpdate = shouldUpdate || (target === 'state') && getPath(changed, path)
      const resolvedValue = target === 'state' ? map[key](ctx).value : values[key]

      if (this.options.filterFalsy && !resolvedValue) {
        return resolved
      }

      resolved[key] = resolvedValue

      return resolved
    }, {})

    if (shouldUpdate) {
      this.setUrl(this.mapper.stringify(route, Object.assign({}, resolvedMap)))
      console.log('update on flush')
    }
  }

  getRoutablePart (url) {
    let path = url.replace(this.addressbar.origin, '')
    if (this.options.onlyHash && !~path.indexOf('#')) {
      // treat hash absense as root route
      path = path + '#/'
    }
    return path.indexOf(this.options.baseUrl) === 0
      ? path.replace(this.options.baseUrl, '')
      : null
  }

  setUrl (url) {
    this.addressbar.value = this.options.baseUrl + url
  }

  getUrl () {
    return this.addressbar.value.replace(this.addressbar.origin + this.options.baseUrl, '')
  }

  goTo (url) {
    this.addressbar.value = this.options.baseUrl + url
    this.onUrlChange()
  }

  redirect (url) {
    this.addressbar.value = {
      value: this.options.baseUrl + url,
      replace: true
    }

    this.onUrlChange()
  }
}
