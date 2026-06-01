export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
