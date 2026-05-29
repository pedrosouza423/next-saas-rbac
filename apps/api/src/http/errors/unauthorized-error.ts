export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
