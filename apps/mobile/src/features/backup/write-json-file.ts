import { File, type Paths } from 'expo-file-system';

/** Écrit `data` en JSON lisible dans `directory`, en écrasant un fichier du même nom. */
export function writeJsonFile(directory: typeof Paths.cache, name: string, data: unknown): File {
  const file = new File(directory, name);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(JSON.stringify(data, null, 2));
  return file;
}
