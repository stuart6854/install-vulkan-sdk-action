import * as core from '@actions/core'
import * as downloader from './downloader'
import * as input from './inputs'
import * as installer from './installer'
import * as os from 'os'
import * as tc from '@actions/tool-cache'
import * as version_getter from './versiongetter'
import {debug} from 'console'
import {execSync} from 'child_process'

export function add_path_variable(value: string): string {
  return execSync(`echo "PATH=$PATH:${value}" >> $GITHUB_ENV`, {
    stdio: 'pipe'
  }).toString()
}

function show_cache(): void {
  const cachedVersions = tc.findAllVersions('vulkan_sdk', os.arch())
  if (cachedVersions.length !== 0) {
    debug(`Versions of vulkan_sdk available: ${cachedVersions}`)
  }
}

async function find_in_cache_vulkan_sdk(version: string): Promise<string> {
  return tc.find('vulkan_sdk', version, os.arch())
}

async function download_vulkan_sdk(version: string): Promise<string> {
  return await downloader.download_vulkan_sdk(version)
}

async function get_vulkan_sdk(version: string): Promise<string> {
  let s = await find_in_cache_vulkan_sdk(version)
  if (!s) {
    s = await download_vulkan_sdk(version)
  }
  return s
}

async function find_in_cache_vulkan_runtime(version: string): Promise<string> {
  return tc.find('vulkan_runtime', version, os.arch())
}

async function download_vulkan_runtime(version: string): Promise<string> {
  return await downloader.download_vulkan_runtime(version)
}

async function get_vulkan_runtime(version: string): Promise<string> {
  let s = await find_in_cache_vulkan_runtime(version)
  if (!s) {
    s = await download_vulkan_runtime(version)
  }
  return s
}

async function run(): Promise<void> {
  try {
    const inputs: input.Inputs = await input.getInputs()

    const version = await version_getter.determine_version_to_download(inputs.version)

    const sdk_installer_path = await get_vulkan_sdk(version)

    const installation_path = await installer.install(sdk_installer_path, inputs.destination)

    debug(`Installation Path -> ${installation_path}`)

    add_path_variable(`${installation_path}`)

    core.exportVariable('VULKAN_SDK', `${installation_path}`)

    core.info(`Successfully added VULKAN_SDK ${version} to PATH.`)

    core.info(`The environment variable VULKAN_SDK was set to "${installation_path}".`)

    core.setOutput('VULKAN_VERSION', version)
  } catch (error) {
    let errorMessage = 'ErrorMessage'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    core.error(errorMessage)
  }
}

run()
function get_VulkanSDK() {
  throw new Error('Function not implemented.')
}
