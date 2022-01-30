import * as core from '@actions/core'
import * as platform from './platform'
import * as version_getter from './versiongetter'

export interface Inputs {
  version: string
  destination: string
  cache: boolean
  //optional_components: string[]
}

export async function getInputs(): Promise<Inputs> {
  return {
    version: await getInputVersion(core.getInput('version', {required: false})),
    destination: await getInputDestination(core.getInput('destination', {required: false})),
    cache: /true/i.test(core.getInput('cache', {required: false}))
    //optional_components: await getInputOptionalComponents(core.getInput('optional_components', {required: false}))
  }
}

async function getInputVersion(version: string): Promise<string> {
  let requestedVersion: string = version

  // throw error, if requestedVersion is a crappy version number
  if (!requestedVersion && !validateVersion(requestedVersion)) {
    const availableVersions = await version_getter.getAvailableVersions()
    const versions = JSON.stringify(availableVersions, null, 2)

    throw new Error(
      `Invalid format of version. Please specify a version using the format 'major.minor.build.rev'.
       The following versions are available: ${versions}.`
    )
  }

  if (requestedVersion === '') {
    requestedVersion = 'latest'
  }

  return requestedVersion
}

function validateVersion(version: string): boolean {
  if (version === 'latest') return true
  const re = /^\d+\.\d+\.\d+\.\d+$/
  return re.test(version)
}

async function getInputDestination(destination: string): Promise<string> {
  // if location wasn't specified, use default install location for platform
  if (!destination || destination === '') {
    if (platform.IS_WINDOWS) {
      return 'C:\\VulkanSDK'
    }
    if (platform.IS_LINUX) {
      return ''
    }
    if (platform.IS_MAC) {
      return ''
    }
  }

  return destination
}

// https://vulkan.lunarg.com/doc/view/latest/windows/getting_started.html#user-content-installing-optional-components
export async function getInputOptionalComponents(optional_components: string): Promise<string[]> {
  const optional_components_allowlist: string[] = [
    'com.lunarg.vulkan.32bit',
    'com.lunarg.vulkan.thirdparty',
    'com.lunarg.vulkan.debug',
    'com.lunarg.vulkan.debug32'
  ]

  const input_components: string[] = optional_components.split(',').map((item: string) => item.trim())

  const invalid_input_components = input_components.filter(
    item => optional_components_allowlist.includes(item) === false
  )
  core.info(`Please remove the following invalid optional_components: ${invalid_input_components}!`)

  const valid_input_components = input_components.filter(item => optional_components_allowlist.includes(item) === true)
  if (valid_input_components) {
    core.info(`Installing Optional Components: ${valid_input_components}.`)
  }

  return valid_input_components
}
