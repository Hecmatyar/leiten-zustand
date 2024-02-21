export interface ILeitenEffects<VALUE, State> {
  patchEffect?: (value: VALUE) => Partial<State>;
  sideEffect?: (value: { prev: VALUE; next: VALUE }) => void;
}
