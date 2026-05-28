export async function parseJsonBody(request: Request) {
  try {
    const data = (await request.json()) as unknown
    return { data, error: null }
  } catch {
    return { data: null, error: 'Malformed JSON request body' }
  }
}
