import { 
  Command,
} from './command_types';


export default interface Plugin {
  getCommands: () => Command[];
  getIsEnabled: () => boolean;
}