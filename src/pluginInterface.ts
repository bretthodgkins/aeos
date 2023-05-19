import { 
  Command,
} from './command_types';


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