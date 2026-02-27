export type User = { id: string; email: string };

export type DpilRow = {
  function: string;
  level: 'A' | 'B' | 'C' | 'D';
  limit: number;
  reference?: string;
};

export type EducationTopic = {
  key: string;
  title: string;
  description: string;
  references?: { title: string; ref: string }[];
  sources?: { title: string; url: string }[];
};
