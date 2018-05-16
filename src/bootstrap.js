import path from 'path'
import Koa from 'koa'
import mongooseClient from './libraries/database/client/mongoose'
import { load } from '@spksoft/koa-decorator'
import gracefulShutdown from 'http-graceful-shutdown'
import config from './config'
import { getLogger } from './libraries/logger'
import { NotFoundError, ErrorCode } from './libraries/error'
import {
  bodyParser,
  compress,
  cors,
  accessLogger,
  errorHandler,
  responseFormatter,
} from './middlewares'

const logger = getLogger('app:bootstrap')
const app = new Koa()
logger('set a middleware to main app')

// Plug "system middlewares"
bodyParser(app)
compress(app)
cors(app)
accessLogger(app)
errorHandler(app)
responseFormatter(app)

// load router
const apiRouter = load(path.resolve(__dirname, 'controllers'), '.controller.js')
app.use(apiRouter.routes())
app.use(
  apiRouter.allowedMethods({
    throw: true,
    notImplemented: () =>
      new NotFoundError(
        'The resquested uri does not match to any route tables',
        ErrorCode.URI_NOT_FOUND.CODE,
      ),
    methodNotAllowed: () =>
      new NotFoundError(
        'The resquested uri does not match to any route tables',
        ErrorCode.URI_NOT_FOUND.CODE,
      ),
  }),
)

// // Connect to database
if (config.database.databaseURI) {
  mongooseClient(config.database.databaseURI)
    .then(dbClient => {
      logger(`Connected to ${dbClient.host}:${dbClient.port}/${dbClient.name}`)
    })
    .catch(err => {
      console.error('Unable to start server!', err)
      process.exit(1)
    })
}

const server = app.listen(config.system.port)
logger(`starting server on port ${config.system.port}`)
gracefulShutdown(server)
