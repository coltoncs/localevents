import { handleRequest } from '@vercel/react-router/entry.server'
import { RouterContextProvider } from 'react-router'

// this is a workaround to provide RouterContextProvider 
// as loadContext for Vercel's React Router wrapper. Otherwise our
// middleware setup would not work correctly. i.e. Clerks middleware
export function getLoadContext() {
  // Return an instance of RouterContextProvider when middleware is enabled
  return new RouterContextProvider()
}

export default handleRequest
