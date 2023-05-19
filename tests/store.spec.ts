import store from '../src/store';

jest.setTimeout(100000); // 100 seconds
describe('addKeyValueToStore', () => {
  it('can add key value to store', () => {
    const initialResult = store.getValue('test');
    expect(initialResult).toBeUndefined();
    store.addKeyValueToStore('test', 'dog');
    const newResult = store.getValue('test');
    expect(newResult).toBe('dog');
  });

  it('can add empty string value to store', () => {
    const initialResult = store.getValue('test2');
    expect(initialResult).toBeUndefined();
    store.addKeyValueToStore('test2', '');
    const newResult = store.getValue('test2');
    expect(newResult).toBe('');
  });
});
