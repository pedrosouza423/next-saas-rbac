export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
