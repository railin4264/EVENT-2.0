const fs = require('fs');
const { MongoMemoryServer } = require('mongodb-memory-server');

test('a locked or failed local database stops startup without deleting files or retrying a reset', async () => {
  const create = jest.spyOn(MongoMemoryServer, 'create').mockRejectedValue(new Error('DBPathInUse: another process owns this database'));
  const remove = jest.spyOn(fs, 'rmSync').mockImplementation(() => { throw new Error('Test blocked destructive cleanup'); });
  const unlink = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => { throw new Error('Test blocked lock removal'); });
  const mkdir = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
  const exit = jest.spyOn(process, 'exit').mockImplementation(() => undefined);
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    require('../scripts/dev-local');
    await new Promise(resolve => setImmediate(resolve));
    expect(create).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(unlink).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
    expect(error.mock.calls.flat().join(' ')).toContain('Se conservan todos sus archivos');
  } finally {
    for (const spy of [create, remove, unlink, mkdir, exit, error]) spy.mockRestore();
  }
});
