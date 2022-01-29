import * as core from '@actions/core'
import * as downloader from './downloader'
import * as input from './inputs'
import * as installer from './installer'
import * as os from 'os'
import * as tc from '@actions/tool-cache'
import * as version_getter from './versiongetter'
import {debug} from 'console'

export function prependToPath(newPath: string): void {
  let currentPath = process.env.PATH ? process.env.PATH : ''
  if (currentPath.length > 0) {
    const delimiter = process.platform === 'win32' ? ';' : ':'
    currentPath = `${delimiter}${currentPath}`
  }

  process.env.PATH = `${newPath}${currentPath}`
}

async function run(): Promise<void> {
  try {
    const inputs: input.Inputs = await input.getInputs()

    const version = await version_getter.determineVersionToDownload(inputs.version)

    const cachedVersions = tc.findAllVersions('vulkan_sdk')
    if (cachedVersions.length !== 0) {
      debug(`Versions of vulkan_sdk available: ${cachedVersions}`)
    }

    const cacheDir = tc.find('vulkan_sdk', version, os.arch())

    if (cacheDir !== '') {
      const download_path = await downloader.download(version)
      const installation_path = installer.install(download_path, inputs.destination)
      debug(`Download Path -> ${download_path}`)
      debug(`Installation Path -> ${installation_path}`)
    }

    core.addPath(cacheDir)
    debug(`Installation Path (from cache) -> ${cacheDir}`)

    prependToPath(`${cacheDir}`)
    core.info(`Successfully added VULKAN_SDK ${version} to PATH.`)
    core.info(`The environment variable VULKAN_SDK was set to ${cacheDir}.`)
  } catch (error) {
    let errorMessage = 'Failed to do something exceptional'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    core.error(errorMessage)
  }
}

run()
