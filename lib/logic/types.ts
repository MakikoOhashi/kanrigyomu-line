export type UserRow = {
  id: string;
  line_user_id: string;
  current_block: number;
  cursor_in_block: number;
  streak_count: number;
  last_answer_date: string | null;
  last_sent_date: string | null;
  active: boolean;
};

export type QuestionRow = {
  id: string;
  block_number: number;
  order_index: number;
  stem: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  correct: number;
  explanation: string;
};
