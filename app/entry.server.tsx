import { handleRequest } from '@vercel/react-router/entry.server'
import { RouterContextProvider } from 'react-router'

// We can remove this in the future, this is a workaround
// for Vercel's current lack of support for middleware
export function getLoadContext() {
  // Return an instance of RouterContextProvider when middleware is enabled
  return new RouterContextProvider()
}

export default handleRequest
