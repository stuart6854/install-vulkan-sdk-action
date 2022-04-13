import * as io from '@actions/io'
import {getPlatform} from '../src/platform'
import * as downloader from '../src/downloader'
import * as installer from '../src/installer'
import * as inputs from '../src/inputs'
import * as version_getter from '../src/versiongetter'
import * as path from 'path'
import {expect, test} from '@jest/globals'
import {env} from 'process'

env.RUNNER_TOOL_CACHE = path.join(__dirname, '../tmp/runner_tools')
env.RUNNER_TEMP = path.join(__dirname, '../tmp/runner_tmpdir')

describe('inputs', () => {
  test('an invalid optional_components list, results in an empty components list', async () => {
    const optional_components = 'a, b, c'
    const out = inputs.getInputOptionalComponents(optional_components)
    expect(out).toBe({})
  })
  test('optional_components list is filtered', async () => {
    const optional_components = 'a, b, com.lunarg.vulkan.32bit'
    const out = inputs.getInputOptionalComponents(optional_components)
    const expected_optional_components = 'com.lunarg.vulkan.32bit'
    expect(out).toEqual(expected_optional_components)
  })
})

describe('platform', () => {
  test('getPlatform', async () => {
    const platform = getPlatform()
    let plat: string = process.platform
    if (plat === 'win32') {
      plat = 'windows'
    }
    console.log(`Running on platform: ${plat}`)
    expect(platform).toStrictEqual(plat)
  })
})

describe('version', () => {
  it('Fetches the list of latest versions.', async () => {
    const latestVersions = await version_getter.getLatestVersions()
    console.log(latestVersions)
    expect(latestVersions).not.toBeNull
    expect(latestVersions?.windows).not.toEqual('')
  })
})

describe('download', () => {
  // remove the cache and temp afterwards
  beforeAll(async () => {
    await io.rmRF(<string>env.RUNNER_TOOL_CACHE)
    await io.rmRF(<string>env.RUNNER_TEMP)
  }, 100000)

  it('Gets the download URL of the latest version.', async () => {
    const input_version = 'latest'
    const version = await version_getter.determine_version_to_download(input_version)
    const latestVersion = await downloader.get_url_vulkan_sdk(version)
    expect(latestVersion).not.toBeNull
  })

  /*it('Gives an error, when trying to install an invalid version number.', () => {
    expect.assertions(1)
    return downloader.download_vulkan_sdk('0.0.0').catch(e => {
      expect(<Error>e.message).toContain('version not found')
    })
  }, 60000)*/

  /*it('Downloads to default path, when using a valid version number.', () => {
    return downloader.download_vulkan_sdk('1.2.189.0').then(data => {
      expect(data).not.toEqual('')
    })*
  }, 180000)*/
})

describe('installer', () => {
  it('Installs SDK into "../third-party/vulkan-sdk" folder, when using a valid version number.', async () => {
    const version = '1.2.189.0'
    const sdk_download_path = await downloader.download_vulkan_sdk(version)
    const sdk_install_path = path.join(__dirname, '/../third-party/vulkan-sdk')
    return installer.install_vulkan_sdk(sdk_download_path, sdk_install_path, version).then(data => {
      expect(data).not.toEqual('')
    })
  }, 300000)

  /*it('Allows to install optional components', async () => {
    const input_optional_components = 'com.lunarg.vulkan.32bit, com.lunarg.vulkan.debug32'
  }, 240000)*/
})
