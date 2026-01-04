import 'dotenv/config'
import { createClerkClient } from '@clerk/backend'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY

if (!ADMIN_USER_ID) {
  console.error('ADMIN_USER_ID environment variable not set')
  process.exit(1)
}

if (!CLERK_SECRET_KEY) {
  console.error('CLERK_SECRET_KEY environment variable not set')
  process.exit(1)
}

const clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY })

async function setAdminRole() {
  try {
    await clerkClient.users.updateUserMetadata(ADMIN_USER_ID, {
      publicMetadata: { role: 'admin' }
    })
    console.log(`✓ Successfully set admin role for user: ${ADMIN_USER_ID}`)
  } catch (error) {
    console.error('✗ Error setting admin role:', error)
    process.exit(1)
  }
}

setAdminRole()
