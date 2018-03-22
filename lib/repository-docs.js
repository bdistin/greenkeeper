const _ = require('lodash')
const crypto = require('crypto')

const updatedAt = require('./updated-at')
const {
  getFiles,
  formatPackageJson,
  getGreenkeeperConfigFile,
  getPackagePathsFromConfigFile
} = require('./get-files')

module.exports = {
  createDocs,
  updateRepoDoc
}

//  if a package.json is added/renamed/moved in the .greenkeeperrc
//  if a .greenkeeperrc is added
// trigger (several) initial-subgroup-pr

async function updateRepoDoc (installationId, doc) {
  const fullName = doc.fullName
  const greenkeeperConfigFile = await getGreenkeeperConfigFile(installationId, fullName)
  const defaultFiles = {
    'package.json': [],
    'package-lock.json': [],
    'yarn.lock': [],
    'npm-shrinkwrap.json': []
  }
  let filePathsFromConfig = []
  if (!_.isEmpty(greenkeeperConfigFile)) {
    // TODO: validate configFile
    filePathsFromConfig = getPackagePathsFromConfigFile(greenkeeperConfigFile)
    _.set(doc, ['greenkeeper'], greenkeeperConfigFile)
  }
  const filesFromConfig = _.isEmpty(filePathsFromConfig)
    ? await getFiles(installationId, fullName)
    : await getFiles(installationId, fullName, filePathsFromConfig)

  const files = _.merge(filesFromConfig, defaultFiles)
  // handles multiple paths for files like this:
  // files: {
  //   package.json: ['package.json', 'backend/package.json', 'frontend/package.json']
  //   package-lock.json: ['package-lock.json', 'backend/package-lock.json']
  //   npm-shrinkwrap.json: [],
  //   yarn.lock: []
  // }
  doc.files = _.mapValues(files, fileType => fileType
    .filter(file => !!file.content)
    .map(file => file.path))

  // formats *all* the package.json files
  const pkg = formatPackageJson(files['package.json'])

  if (!pkg) {
    _.unset(doc, ['packages'])
    return doc
  }

  _.set(doc, ['packages'], pkg)
  return doc
}

// need to add a top level config key with the contents of the greenkeeperrc
function createDocs ({ repositories, accountId }) {
  return repositories.map(repo => updatedAt({
    _id: String(repo.id),
    type: 'repository',
    enabled: false,
    accountId,
    fullName: repo.full_name,
    private: repo.private,
    fork: repo.fork,
    hasIssues: repo.has_issues,
    accountToken: crypto.randomBytes(32).toString('hex'),
    packages: {}
  }))
}
