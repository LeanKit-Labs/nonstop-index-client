## continua-hub-client
Library for communicating with the Continua hub HTTP API.

## Use
To get a configured instance of the server API, you can use one of the following approaches:

### Configuration hash
See the Configuration section for a detailed explanation of the possible configuration values
```javascript
// for uploading
var server = require( 'continua-hub-client' )( {
  host: 'my-hub',
  port: 443
} );
// uploads will be POSTed to https://my-hub:443/api/package/{package name}


// for getting package lists/downloading
var server = require( 'continua-hub-client' )( {
  host: 'my-hub',
  port: 443,
  project: 'test',
  owner: 'arobson',
  branch: 'master'
} );

// package lists will use the following URL (note - architecture and platform are set automatically)
// https://my-hub:443/api/package/list?project=test&owner=arobson&branch=master&platform=darwin&architecture=x64
```

### Daedalus - Service and Configuration
This example is a bit over-simplified. See [daedalus](https://github.com/LeanKit-Labs/daedalus) for more advanced use patterns. The point is to show how you can easily use this library in conjunction with daedalus and fount to auto-discover the continua-hub end point from Consul.

__index.js__
```javascript
var daedalus = require( 'daedalus' )();
var server;

daedalus.initialize( {
  hub: {
    service: 'conitnua-hub',
    module: './hub-client.js',
    config: 'hub-client'
  }
} )
.then( function( fount ) {
  fount.resolve( 'hub', function( hub ) { server = hub; } );
} );
```

__hub-client.js__
```javascript
// the format of the function returned from the module matches
// what daedalus expects
module.exports = require( 'continua-hub-client' );
```

## Configuration
The configuration hash can contain a lot of information. Depending on your use case, the required minimum information changes to ensure proper function. Defaults are shown for most values except where noted.

```javascript
{
  // required server config
  host: 'localhost',
  port: 80, // a port of 443 will turn https on

  // optional server config
  https: false,
  apiUrl: 'api', // base URL for all API routes
  packageList: 'package/list', // the URL to get a list of packages
  files: 'package', // URL segment where packages can be downloaded from
  uploads: 'package', // URL segment to upload packages to

  // optional paths
  downloads: './downloads',
  installed: './installed'

  // required package filters - no defaults provided
  project: 'test',
  owner: 'arobson',
  branch: 'master',
  
  // optional package filters - no defaults provided for these
  version: '0.1.0',
  build: #|'release',
  architecture: 'x64|x86',
  platform: 'darwin|linux|win32',
  osName: 'Windows',
  osVersion: '2012 R2'
}
```

  Note: if you will be requesting package lists, you must provide project, owner and branch in the config. There are no defaults for these values.

### Uploading Packages (cli/build agent)
The only required information can be provided via the service argument from [daedalus](https://github.com/LeanKit-Labs/daedalus) or via the config argument.

```javascript
var server = require( 'continua-hub-client' )( { host: 'my-hub', port: 80 } );
```

### Listing and Downloading Packages (bootstrapper)
Listing and downloading require the project, owner and branch to be specified (at least). The platform and architecture are automatically populated based on the machine the code is running on.

```javascript
var server = require( 'continua-hub-client' )( { 
  host: 'my-hub',
  port: 80,
  project: 'test',
  owner: 'arobson',
  branch: 'master'
} );
```

## Server API
Once you have access to the server instance, you can find the latest package version available, download a package or upload a package.

### download( target, [token|username], [password] )
Downloads the target package. You can provide either a token OR a username and password in order to authenticate with the hub service. The file will be downloaded to the path specified by the `downloads` property of the config hash (default is './downloads'). Returns a promise that resolves to an object with the format:

```javascript
  { 
    path: /* path where the file was downloaded */, 
    installPath: /* path where packages should be unpacked */, 
    file: /* the file that was downloaded */
  }
```

```javascript
// target - the full package name to download
// token|username - either a auth token or user name
// password - if a user name was provided, you should also provide a password to authenticate
server.download( 'test~arobson~master~0.1.0~1~darwin~any~any~x64.tar.gz', 'some-auth-token' )
  .then( function( info ) {
    // on success
  } );
```
### getLatest( ignore, [token|username], [password] )
Gets information for the latest available package given the package properties set by config (or by the set calls). Returns a promise that resolves to a package information object with the format:

```javascript
  {
    file: 'proj1~owner1~branch2~0.1.0~1~darwin~OSX~10.9.2~x64.tar.gz'
    project: 'test',
    owner: 'arobson',
    branch: 'master',
    version: '0.1.0-1',
    build: '1',
    platform: 'darwin',
    osName: 'any',
    osVersion: 'any',
    architecture: 'x64'
  }
```

Most likely, the property you need from this object will be the `file` property - supplying this to the `download` call will allow your application to download the latest.

```javascript
// ignore - an array of versions that should be ignored when determining the latest package
// token|username - either a auth token or user name
// password - if a user name was provided, you should also provide a password to authenticate
server.getLatest( [], 'some-auth-token' )
  .then( function( latest ) {

  } );
```

### setBranch( branch )
Filter packages by branch when getting latest.

```javascript
server.setBranch( 'dev' );
```

### setBuild( build )
Filter packages by build when getting latest. Valid build values are an existing build number or 'release' (limits packages to only official releases).

  Note: Only use with a build number if you've called setVersion or provided a version via config

```javascript
// only allow official releases when getting latest
server.setBuild( 'release' );

// limit to a specific build number
server.setBuild( 4 );
```

### setOwner( owner )
Filter packages by specific owner (fork) when getting latest.

```javascript
server.setOwner( 'ifandelse' );
```

### setVersion( version )
Filter packages by version when getting latest. Valid versions are 3 part specifiers not including the build. Setting this without limiting the build to a number or 'release' will cause the newest build to be pulled for the version when getting latest.

```javascript
server.setVersion( '0.1.2' )
```

### upload( packageInfo, [token|username], [password] )
Uploads a package. PackageInfo should be the same format of the object returned from the pack library's `create` call. Returns a promise that resolves to the HTTP response body on success (statusCode === 200).

```javascript
server.upload( info, 'someUserName', 'somePassword' )
  .then( function( response ) {
    // on success
  } );
```

## Dependencies
This would not have been possible without several great Node modules:

 * request
 * when
 * lodash
 * mkdirp
 * debug

## Dependents
The following continua projects rely on this library:

 * [build cli](https://github.com/LeanKit-Labs/continua)
 * [build agent](https://github.com/LeanKit-Labs/continua-agent)