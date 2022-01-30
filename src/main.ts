import * as core from '@actions/core'
import * as downloader from './downloader'
import * as input from './inputs'
import * as installer from './installer'
import * as os from 'os'
import * as tc from '@actions/tool-cache'
import * as version_getter from './versiongetter'
import {debug} from 'console'
import {execSync} from 'child_process'

// use core.exportVariable?
export function setEnvVar(name: string, value: string): string {
  return execSync(`echo "${name}=${value}" >> $GITHUB_ENV`, {
    stdio: 'pipe'
  }).toString()
}

export function addToPathVar(value: string): string {
  return execSync(`echo "PATH=$PATH:${value}" >> $GITHUB_ENV`, {
    stdio: 'pipe'
  }).toString()
}

async function run(): Promise<void> {
  try {
    const inputs: input.Inputs = await input.getInputs()

    const version = await version_getter.determineVersionToDownload(inputs.version)

    /*const cachedVersions = tc.findAllVersions('vulkan_sdk')
    if (cachedVersions.length !== 0) {
      debug(`Versions of vulkan_sdk available: ${cachedVersions}`)
    }*/

    const cacheDir = tc.find('vulkan_sdk', version, os.arch())

    if (cacheDir) {
      debug(`Installation Path (from cache) -> ${cacheDir}`)
      core.addPath(cacheDir)
      addToPathVar(`${cacheDir}`)
      setEnvVar('VULKAN_SDK', `${cacheDir}`)
    } else {
      const download_path = await downloader.download(version)
      //debug(`Download Path -> ${download_path}`)
      const installation_path = installer.install(download_path, inputs.destination)
      //debug(`Installation Path -> ${installation_path}`)
      addToPathVar(`${installation_path}`)
      setEnvVar('VULKAN_SDK', `${installation_path}`)
    }

    core.info(`Successfully added VULKAN_SDK ${version} to PATH.`)
    core.info(`The environment variable VULKAN_SDK was set to ${cacheDir}.`)

    core.setOutput('VULKAN_VERSION', version)
    //core.setOutput('VULKAN_SDK', `${installation_path}`)

  } catch (error) {
    let errorMessage = 'ErrorMessage'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    core.error(errorMessage)
  }
}

run()
