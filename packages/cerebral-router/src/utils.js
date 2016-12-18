export function flattenConfig (config, prev = '') {
  return config.reduce((flattened, {path, signal, map, routes}) => {
    if (Array.isArray(routes)) {
      return Object.assign(flattened, flattenConfig(routes, prev + path))
    }

    flattened[prev + path] = {signal, map}

    return flattened
  }, {})
}

export function getRoutableSignals (config, controller) {
  return Object.keys(config).reduce((routableSignals, route) => {
    const {signal: signalName, map} = config[route]

    if (!signalName) {
      return routableSignals
    }

    if (routableSignals[signalName]) {
      throw new Error(`Cerebral router - The signal ${signalName} has already been bound to route ${route}. Create a new signal and reuse actions instead if needed.`)
    }

    routableSignals[signalName] = {
      route,
      map,
      signal: controller.getSignal(signalName)
    }

    return routableSignals
  }, {})
}

export function getPath (object, path) {
  return path.split('.').reduce((currentPath, key) => {
    return currentPath ? currentPath[key] : undefined
  }, object)
}
