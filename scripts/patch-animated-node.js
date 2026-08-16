const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../node_modules/react-native/Libraries/Animated/nodes/AnimatedNode.js');

if (!fs.existsSync(targetPath)) {
  console.log('AnimatedNode.js not found, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(targetPath, 'utf8');

// Patch addListener
content = content.replace(
  `  addListener(callback: (value: any) => unknown): string {
    const id = String(_uniqueId++);
    this._listeners.set(id, callback);
    return id;
  }`,
  `  addListener(callback: (value: any) => unknown): string {
    const id = String(_uniqueId++);
    if (typeof this._listeners.set === 'function') {
      this._listeners.set(id, callback);
    } else {
      this._listeners[id] = callback;
    }
    return id;
  }`
);

// Patch removeListener
content = content.replace(
  `  removeListener(id: string): void {
    this._listeners.delete(id);
  }`,
  `  removeListener(id: string): void {
    if (typeof this._listeners.delete === 'function') {
      this._listeners.delete(id);
    } else {
      delete this._listeners[id];
    }
  }`
);

// Patch removeAllListeners
content = content.replace(
  `  removeAllListeners(): void {
    this._listeners.clear();
  }`,
  `  removeAllListeners(): void {
    if (typeof this._listeners.clear === 'function') {
      this._listeners.clear();
    } else {
      this._listeners = {};
    }
  }`
);

// Patch hasListeners
content = content.replace(
  `  hasListeners(): boolean {
    return this._listeners.size > 0;
  }`,
  `  hasListeners(): boolean {
    if (typeof this._listeners.size === 'number') {
      return this._listeners.size > 0;
    }
    return Object.keys(this._listeners).length > 0;
  }`
);

// Patch __callListeners
content = content.replace(
  `  __callListeners(value: number): void {
    const event = {value};
    this._listeners.forEach(listener => {
      listener(event);
    });
  }`,
  `  __callListeners(value: number): void {
    const event = {value};
    if (typeof this._listeners.forEach === 'function') {
      this._listeners.forEach(listener => {
        if (listener) listener(event);
      });
    } else {
      for (const key in this._listeners) {
        if (typeof this._listeners[key] === 'function') {
          this._listeners[key](event);
        }
      }
    }
  }`
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully patched AnimatedNode.js');
