import * as httpm from '@actions/http-client'

export const client: httpm.HttpClient = new httpm.HttpClient('install-vulkan-sdk-action', [], {
  keepAlive: false,
  allowRedirects: true,
  maxRedirects: 3
})
