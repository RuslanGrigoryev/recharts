import { existsSync, readFileSync } from 'fs';
import { builtinModules } from 'module';
import ts from 'typescript';
import { describe, it, expect } from 'vitest';
import { globSync } from 'glob';

import packageJson from '../package.json';

/**
 * If you see this test failing it means the build output has changed.
 *
 * If that is intentional - for example, you added a new file, or a new Chart type, all good!
 * Change the test and run build again.
 * If the test failure is in snapshots, then update the snapshots by running this command:
 *
 *    npm run test-build-output -- --update
 *
 * If you did not expect the output to change, then consider going back and review your changes.
 * We do not want to npm publish too many files, or not enough files.
 */
describe('expected folder structure', () => {
  describe('package.json', () => {
    it('should include output files', () => {
      expect(packageJson.files).toHaveLength(5);
      expect(packageJson.files).toContain('*.md');
      expect(packageJson.files).toContain('types');
      expect(packageJson.files).toContain('es6');
      expect(packageJson.files).toContain('umd');
      expect(packageJson.files).toContain('lib');
    });

    it('should point to a main file', () => {
      expect(packageJson.main).toEqual('lib/index.js');
      expect(existsSync(`./${packageJson.main}`)).toBe(true);
    });

    it('should point to a main module file', () => {
      expect(packageJson.module).toEqual('es6/index.js');
      expect(existsSync(`./${packageJson.module}`)).toBe(true);
    });

    it('should point to a jsnext:main file', () => {
      expect(packageJson['jsnext:main']).toEqual('es6/index.js');
      expect(existsSync(`./${packageJson['jsnext:main']}`)).toBe(true);
    });

    it('should point to a types file', () => {
      expect(packageJson.types).toEqual('types/index.d.ts');
      expect(existsSync(`./${packageJson.types}`)).toBe(true);
    });
  });

  async function checkFolderOutput(folder: string, snapshot: string) {
    return expect(globSync(folder, { dot: true, platform: 'linux' }).sort()).toMatchFileSnapshot(
      `./snapshots/${snapshot}.txt`,
    );
  }

  describe('types folder output', () => {
    it('should have expected files and no more', async () => {
      await checkFolderOutput('types/**/*', 'typesFiles');
    });
  });

  describe('types folder imports', () => {
    function getPackageName(specifier: string): string {
      const parts = specifier.split('/');
      return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
    }

    it('should only import packages declared in dependencies or peerDependencies', () => {
      const declared = new Set<string>([
        ...Object.keys(packageJson.dependencies),
        ...Object.keys(packageJson.peerDependencies),
        'recharts',
      ]);
      const undeclared = new Set<string>();
      globSync('types/**/*.d.ts', { platform: 'linux' }).forEach(file => {
        const info = ts.preProcessFile(readFileSync(file, 'utf8'), true, true);
        info.importedFiles
          .map(imported => imported.fileName)
          .filter(specifier => !specifier.startsWith('.') && !builtinModules.includes(specifier))
          .map(getPackageName)
          .filter(name => !declared.has(name))
          .forEach(name => undeclared.add(`${name} (${file})`));
      });
      expect([...undeclared].sort()).toEqual([]);
    });
  });

  describe('es6 folder output', () => {
    it('should have expected files and no more', async () => {
      await checkFolderOutput('es6/**/*', 'es6Files');
    });
  });

  describe('markdown files output', () => {
    it('should have expected files and no more', async () => {
      await checkFolderOutput('*.md', 'markdownFiles');
    });
  });

  describe('umd folder output', () => {
    it('should have expected files and no more', async () => {
      await checkFolderOutput('umd/**/*', 'umdFiles');
    });
  });

  describe('lib folder output', () => {
    it('should have expected files and no more', async () => {
      await checkFolderOutput('lib/**/*', 'libFiles');
    });
  });
});
