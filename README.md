[![GitHub Releases](https://img.shields.io/github/release/jakoch/install-vulkan-sdk-action.svg?style=flat-square)](https://github.com/jakoch/install-vulkan-sdk-action/releases/latest)
[![GitHub Workflow Status](https://github.com/jakoch/install-vulkan-sdk-action/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/jakoch/install-vulkan-sdk-action/actions/workflows/build.yml)

# Github Action: Install Vulkan SDK

A Github Action to install the Vulkan SDK and it's runtime.

- This action can be used to install the Vulkan SDK in your Github Action workflows.
- The SDK version number is automatically fetched via the Web API, if not set to a fixed version number manually (latest).
- The installation of optional SDK components is supported.
- The size of the installed SDK is reduced to achieve a smaller cache package size (only on Windows).
- The installation on MacOS is on our [todo list](https://github.com/jakoch/install-vulkan-sdk-action/issues/293).

---

- [Github Action: Install Vulkan SDK](#github-action-install-vulkan-sdk)
  - [What is Vulkan?](#what-is-vulkan)
  - [Usage](#usage)
    - [Quick start](#quick-start)
  - [Action Reference](#action-reference)
    - [Inputs](#inputs)
    - [Outputs](#outputs)
    - [Environment Variables](#environment-variables)
  - [License](#license)

## What is Vulkan?

> The [Khronos Vulkan API](https://khronos.org/registry/vulkan) is an explicit, low-overhead, cross-platform graphics and compute API. Vulkan provides applications with control over the system execution and the system memory to maximize application efficiency on a wide variety of devices from PCs and consoles to mobile phones and embedded platforms.
>
> The Vulkan SDK enables Vulkan developers to develop Vulkan applications.
>

Links: <https://vulkan.org/> | [Vulkan SDK](https://vulkan.lunarg.com/) | [Vulkan SDK Docs](https://vulkan.lunarg.com/doc/sdk/) | [Vulkan Tools](https://vulkan.org/tools) | [Vulkan @ gpuinfo](https://vulkan.gpuinfo.org/)

## Usage

### Quick start

```yaml
jobs:
  build:
    runs-on: ${{ matrix.config.os }}
    strategy:
      matrix:
        config:
          - { name: "Windows", os: windows-latest }
          - { name: "Ubuntu",  os: ubuntu-latest }
          #- { name: "MacOS",   os: macos-latest } not supported, yet

    steps:
      - name: Install Vulkan SDK
        uses: jakoch/install-vulkan-sdk-action@v1.0.0
        with:
          # You can set the Vulkan SDK version to download.
          # Defaults to latest version, if version not set.
          vulkan_version: 1.3.231.1
          optional_components: com.lunarg.vulkan.vma
          install_runtime: true
          cache: true
          stripdown: true

```

## Action Reference

You can find all Inputs and Outputs and their default settings in the [action.yml](https://github.com/jakoch/install-vulkan-sdk-action/blob/main/action.yml) file.

### Inputs

The following inputs can be used as `steps.with` keys:

| Name                 | Type    | Description                             | Default                 | Required |
|----------------------|---------|-----------------------------------------|-------------------------|----------|
| `vulkan_version`     | String  | A Vulkan SDK version (eg. `1.3.231.1`). | If `vulkan_version` is not set, the latest version is used. | false |
| `destination`        | String  | The Vulkan SDK installation folder.     | Windows: `C:\VulkanSDK`. Linux/MacOS: `%HOME` | false |
| `optional_components`| String  | Comma-separated list of components to install. | Default: no optional components. | false |
| `install_runtime`    | bool    | Windows only. Installs the vulkan runtime ('vulkan-1.dll') into a `runtime` folder inside `destination`, if true. Windows: `C:\VulkanSDK\runtime`. | true | false |
| `cache`              | bool    | Cache the Vulkan installation folder.   | true | false |
| `stripdown`          | bool    | Windows only. Weather to reduce the size of the SDK, before caching. | false | false |

### Outputs

The following output variables are available:

| Name               | Type    | Description                           |
|--------------------|---------|---------------------------------------|
| `VULKAN_VERSION`   | String  | The installed Vulkan SDK version.     |
| `VULKAN_SDK`       | String  | The location of your Vulkan SDK files |

### Environment Variables

The following environment variables are set:

| Name              | Type    |  Description                                   |
|-------------------|---------|------------------------------------------------|
| `VULKAN_VERSION`  | String  | The installed Vulkan SDK version.              |
| `VULKAN_SDK`      | String  | The location of your Vulkan SDK files          |
| `VK_LAYER_PATH`   | String  | Linux only: The location of /etc/vulkan/explicit_layer.d  |
| `LD_LIBRARY_PATH` | String  | Linux only: path to vulkan library  |

## License

All the content in this repository is licensed under the [MIT License](https://github.com/jakoch/install-vulkan-sdk-action/blob/main/LICENSE).

Copyright (c) 2021 Jens A. Koch

## Development Reminder

To make a new release:

- bump version number in package.json
- run `npm run npm_install` to install the dependencies
- run `npm run all` to generate a bundled package in dist
- or simply open package.json and click the desired command via script section
- update changelog
- commit the changes, including the dist folder, then push
- tag the commit with the full version number:
   git tag v1.2.3
   git push origin v1.2.3
- force push the `v1` tag to this commit:
   git tag -f v1
   git push origin v1 -f
