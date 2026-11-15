import { ExternalStore } from "@snort/shared"

class Store extends ExternalStore<boolean> {
  #value: boolean

  constructor() {
    super()
    // "false" is stored when it is turned off, so read the value, not just whether it is there
    this.#value = window.localStorage.getItem("accepted-content-warning") === "true"
  }

  setValue(v: boolean) {
    this.#value = v
    window.localStorage.setItem("accepted-content-warning", String(v))
    this.notifyChange()
  }

  takeSnapshot(): boolean {
    return this.#value
  }
}

export const NSFWStore = new Store()
