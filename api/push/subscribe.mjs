import pushHandler from '../push.mjs'

export default async function handler(req, res) {
  return await pushHandler(req, res)
}
