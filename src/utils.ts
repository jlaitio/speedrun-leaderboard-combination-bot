import { SSM } from "aws-sdk";

export const toSeconds = (rta: string) => {
  const parts = rta.split(':').map(x => parseInt(x));
  if (parts.length === 1) return parts[0];
  else if (parts.length === 2) return parts[0]*60 + parts[1];
  else if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
};

export const toRta = (s: number) => {
  const hours = (''+Math.floor(s / 3600));
  const minutes = (''+Math.floor((s % 3600) / 60)).padStart(2, '0');
  const seconds = ('' + Math.floor(s % 60)).padStart(2, '0');

  if (hours === '0') return `${minutes}:${seconds}`;
  else return `${hours}:${minutes}:${seconds}`;
};

export const getSsmSecret = async (name: string): Promise<string> => {
  const ssm = new SSM();
  const response = await ssm.getParameter({
    Name: name,
    WithDecryption: true,
  }).promise();
  return response.Parameter.Value;
}