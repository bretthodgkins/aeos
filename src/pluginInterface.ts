import { 
  Command,
} from './commandTypes';


export default interface AeosPlugin {
  name: string;
  version: string;
  author?: string;
  description?: string;
  help?: string;
  license?: string;

  getCommands: () => Command[];
  getIsEnabled: () => boolean;
}