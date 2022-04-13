import * as core from '@actions/core'
import * as downloader from './downloader'
import * as input from './inputs'
import * as installer from './installer'
import * as platform from './platform'
import * as tc from '@actions/tool-cache'
import * as cache from '@actions/cache'
import * as version_getter from './versiongetter'
import {debug} from 'console'
import {execSync} from 'child_process'
import * as fs from 'fs'

function show_cache(): void {
  const testFolder = '/opt/hostedtoolcache/vulkan_sdk'
  fs.readdirSync(testFolder).forEach(file => {
    core.info(file)
  })
  core.info(`🔎 Show Cache`)
  const cachedVersions = tc.findAllVersions('vulkan_sdk', platform.OS_ARCH)
  if (cachedVersions.length !== 0) {
    core.info(`🎯 Cached versions of vulkan_sdk available: ${cachedVersions}`)
  }
}

async function find_in_cache_vulkan_sdk(version: string): Promise<string> {
  return tc.find('vulkan_sdk', version, platform.OS_ARCH)
}

async function download_vulkan_sdk(version: string): Promise<string> {
  return await downloader.download_vulkan_sdk(version)
}

async function get_vulkan_sdk(version: string, use_cache: boolean): Promise<string> {
  if (use_cache) {
    show_cache()
    let cached_sdk = await find_in_cache_vulkan_sdk(version)
    if (cached_sdk) {
      core.info(`🎯 Found cached Vulkan SDK in path: ${cached_sdk}`)
      // path.resolve(path.join(cached_sdk, 'vulkan-sdk')
      core.addPath(cached_sdk)
      return cached_sdk
    }
  }
  return await download_vulkan_sdk(version)
}

async function find_in_cache_vulkan_runtime(version: string): Promise<string> {
  return tc.find('vulkan_runtime', version, platform.OS_ARCH)
}

async function download_vulkan_runtime(version: string): Promise<string> {
  return await downloader.download_vulkan_runtime(version)
}

async function get_vulkan_runtime(version: string, use_cache: boolean): Promise<string> {
  if (use_cache) {
    let cached_runtime = await find_in_cache_vulkan_runtime(version)
    if (cached_runtime) {
      core.info(`🎯 Found cached Vulkan SDK in path: ${cached_runtime}`)
      // path.resolve(path.join(cached_runtime, 'vulkan-runtime')
      core.addPath(cached_runtime)
      return cached_runtime
    }
  }
  return await download_vulkan_runtime(version)
}

async function run(): Promise<void> {
  try {
    const inputs: input.Inputs = await input.getInputs()

    const version = await version_getter.determine_version_to_download(inputs.version)

    /*const sdk_installer_path = await get_vulkan_sdk(version, inputs.use_cache)

    const installation_path = await installer.install_vulkan_sdk(sdk_installer_path, inputs.destination, version)

    core.addPath(`${installation_path}`)
    core.info(`✔️ [PATH] Added path to Vulkan SDK to environment variable PATH.`)

    core.exportVariable('VULKAN_SDK', `${installation_path}`)
    core.info(`✔️ [VULKAN_SDK] Added environment variable VULKAN_SDK -> "${installation_path}".`)

    core.exportVariable('VULKAN_VERSION', `${version}`)
    core.info(`✔️ [VULKAN_VERSION] Added environment variable VULKAN_VERSION -> "${version}".`)

    core.setOutput('VULKAN_VERSION', version)*/

    if (inputs.install_runtime /*&& platform.IS_WINDOWS*/) {
      const runtime_archive_path = await get_vulkan_runtime(version, inputs.use_cache)
      const installation_path = await installer.install_vulkan_runtime(runtime_archive_path, inputs.destination)
    }
  } catch (error: any) {
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
