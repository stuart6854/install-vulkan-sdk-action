import * as core from '@actions/core'
import * as path from 'path'
import * as platform from './platform'
import * as version_getter from './versiongetter'
import {request} from 'http'

/**
 * List of available Input arguments
 *
 * @export
 * @interface Inputs
 */
export interface Inputs {
  version: string
  destination: string
  install_runtime: boolean
  use_cache: boolean
  optional_components: string[]
  stripdown: boolean
}
/**
 * Handles the incomming arguments for the action.
 *
 * @export
 * @return {*}  {Promise<Inputs>}
 */
export async function getInputs(): Promise<Inputs> {
  return {
    // Warning: This is intentionally "vulkan_version" to avoid unexpected behavior due to naming conflicts.
    // Do not simply use "version", because if "with: version:" is not set (default to latest is wanted),
    // but an environment variable is defined, that will be used (version = env.VERSION)
    // VERSION is often set to env for artifact names.
    version: await getInputVersion(core.getInput('vulkan_version', {required: false})),
    destination: await getInputDestination(core.getInput('destination', {required: false})),
    install_runtime: /true/i.test(core.getInput('install_runtime', {required: false})),
    use_cache: /true/i.test(core.getInput('cache', {required: false})),
    optional_components: await getInputOptionalComponents(core.getInput('optional_components', {required: false})),
    stripdown: /true/i.test(core.getInput('stripdown', {required: false}))
  }
}
/**
 * GetInputVersion accepts a version and validates it.
 * If "vulkan_version" was not set or is empty, assume "latest" version.
 *
 * @export
 * @param {string} requested_version
 * @return {*}  {Promise<string>}
 */
export async function getInputVersion(requested_version: string): Promise<string> {
  // if "vulkan_version" was not set or is empty, assume "latest" version
  if (requested_version === '') {
    requested_version = 'latest'
    return requested_version
  }

  // throw error, if requestedVersion is a crappy version number
  if (!requested_version && !validateVersion(requested_version)) {
    const availableVersions = await version_getter.getAvailableVersions()
    const versions = JSON.stringify(availableVersions, null, 2)

    throw new Error(
      `Invalid format of "vulkan_version: (${requested_version}").
       Please specify a version using the format 'major.minor.build.rev'.
       The following versions are available: ${versions}.`
    )
  }

  return requested_version
}
/**
 * Validates a version number to conform with "1.2.3.4".
 *
 * @export
 * @param {string} version
 * @return {*}  {boolean}
 */
export function validateVersion(version: string): boolean {
  const re = /^\d+\.\d+\.\d+\.\d+$/
  return re.test(version)
}

/**
 * getInputDestination
 *
 * @param {string} destination
 * @return {*}  {Promise<string>}
 */
async function getInputDestination(destination: string): Promise<string> {
  // return default install locations for platform
  if (!destination || destination === '') {
    if (platform.IS_WINDOWS) {
      destination = `C:\\VulkanSDK\\`
    }
    // The .tar.gz file now simply extracts the SDK into a directory of the form 1.x.yy.z.
    // The official docs install into the "~" ($HOME) folder.
    if (platform.IS_LINUX) {
      destination = `${platform.HOME_DIR}/vulkan-sdk`
    }
    // The macOS SDK is intended to be installed anywhere the user can place files such as the user's $HOME directory.
    if (platform.IS_MAC) {
      destination = `${platform.HOME_DIR}/vulkan-sdk`
    }
  }

  destination = path.normalize(destination)

  core.info(`Destination: ${destination}`)

  return destination
}

/**
 * getInputOptionalComponents
 *
 * https://vulkan.lunarg.com/doc/view/latest/windows/getting_started.html#user-content-installing-optional-components
 * list components on windows: "maintenancetool.exe list" or "installer.exe search"
 *
 * @export
 * @param {string} optional_components
 * @return {*}  {string[]}
 */
export function getInputOptionalComponents(optional_components: string): string[] {
  if (!optional_components) {
    return []
  }

  const optional_components_allowlist: string[] = [
    'com.lunarg.vulkan.32bit',
    'com.lunarg.vulkan.sdl2',
    'com.lunarg.vulkan.glm',
    'com.lunarg.vulkan.volk',
    'com.lunarg.vulkan.vma',
    'com.lunarg.vulkan.debug32',
    // components of old installers
    'com.lunarg.vulkan.thirdparty',
    'com.lunarg.vulkan.debug'
  ]

  const input_components: string[] = optional_components
    .split(',')
    .map((item: string) => item.trim())
    .filter(Boolean)

  let invalid_input_components: string[] = input_components.filter(
    item => optional_components_allowlist.includes(item) === false
  )
  if (invalid_input_components.length) {
    core.info(`❌ Please remove the following invalid optional_components: ${invalid_input_components}`)
  }

  let valid_input_components: string[] = input_components.filter(
    item => optional_components_allowlist.includes(item) === true
  )
  if (valid_input_components.length) {
    core.info(`✔️ Installing Optional Components: ${valid_input_components}`)
  }

  return valid_input_components
}
