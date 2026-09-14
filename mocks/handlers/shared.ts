import { HttpResponse, type PathParams } from 'msw'

// Every mocked response is uncached so scenario changes remain visible during development.
export const json = (data: unknown, status = 200, msg = 'Success') =>
  HttpResponse.json(
    { code: status === 200 ? 20000 : status * 100, msg, data },
    {
      status,
      headers: { 'Cache-Control': 'no-store', 'X-Aipoch-Mock': 'msw' }
    }
  )
export const missing = () => json(null, 404, 'Mock route or fixture not found')
export const query = (request: Request) => new URL(request.url).searchParams
export const matches = (text: string, value: string | null) =>
  !value || text.toLowerCase().includes(value.toLowerCase())

/** Convert malformed input to a contract error; unexpected bugs still fail visibly. */
export const withRequest =
  (resolve: (context: { request: Request; params: PathParams }) => Response | Promise<Response>) =>
  async (context: { request: Request; params: PathParams }) => {
    try {
      return await resolve(context)
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof URIError || error instanceof RangeError)
        return json(null, 400, 'Invalid mock request')
      throw error
    }
  }
const positiveInteger = (params: URLSearchParams, name: string, fallback: number) => {
  const raw = params.get(name)
  if (raw === null) return fallback
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < 1 || (name === 'page_size' && value > 100))
    throw new RangeError(`Invalid ${name}`)
  return value
}
export const paginate = <T>(items: T[], params: URLSearchParams) => {
  const page = positiveInteger(params, 'page', 1)
  const page_size = positiveInteger(params, 'page_size', 20)
  return {
    items: items.slice((page - 1) * page_size, page * page_size),
    total: items.length,
    page,
    page_size,
    total_pages: Math.ceil(items.length / page_size)
  }
}
