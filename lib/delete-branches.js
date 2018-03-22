const dbs = require('../lib/dbs')
const updatedAt = require('../lib/updated-at')
const githubQueue = require('./github-queue')

module.exports = async function (
  { installationId, fullName, repositoryId },
  branch
) {
  const { repositories } = await dbs()
  const [owner, repo] = fullName.split('/')
  console.log('branch to be deleted', branch)
  if (!branch) return
  let referenceDeleted = false
  try {
    // TODO: check if modified
    await githubQueue(installationId).write(github => github.gitdata.deleteReference({
      owner,
      repo,
      ref: `heads/${branch.head}`
    }))
    referenceDeleted = true
  } catch (e) {}
  updatedAt(Object.assign(branch, { referenceDeleted }))

  return repositories.bulkDocs([branch])
}
