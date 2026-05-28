// Unit tests for the task status state machine (pure function, no DB).

import {
  canTransition,
  allowedNextStates,
} from '../src/modules/tasks/status-transitions';

describe('task status state machine', () => {
  describe('happy-path linear flow', () => {
    it('TODO → IN_PROGRESS', () => {
      expect(canTransition('TODO', 'IN_PROGRESS')).toBe(true);
    });
    it('IN_PROGRESS → IN_REVIEW', () => {
      expect(canTransition('IN_PROGRESS', 'IN_REVIEW')).toBe(true);
    });
    it('IN_REVIEW → DONE', () => {
      expect(canTransition('IN_REVIEW', 'DONE')).toBe(true);
    });
  });

  describe('skipping a step is forbidden', () => {
    it('TODO → IN_REVIEW (skip IN_PROGRESS) is rejected', () => {
      expect(canTransition('TODO', 'IN_REVIEW')).toBe(false);
    });
    it('IN_PROGRESS → DONE (skip IN_REVIEW) is rejected', () => {
      expect(canTransition('IN_PROGRESS', 'DONE')).toBe(false);
    });
    it('TODO → DONE is rejected', () => {
      expect(canTransition('TODO', 'DONE')).toBe(false);
    });
  });

  describe('BLOCKED is reachable from any active state', () => {
    it.each(['TODO', 'IN_PROGRESS', 'IN_REVIEW'] as const)(
      '%s → BLOCKED',
      from => {
        expect(canTransition(from, 'BLOCKED')).toBe(true);
      },
    );
    it('DONE → BLOCKED is rejected (DONE is terminal)', () => {
      expect(canTransition('DONE', 'BLOCKED')).toBe(false);
    });
  });

  describe('unblocking returns to an active state', () => {
    it.each(['TODO', 'IN_PROGRESS', 'IN_REVIEW'] as const)(
      'BLOCKED → %s is allowed',
      to => {
        expect(canTransition('BLOCKED', to)).toBe(true);
      },
    );
    it('BLOCKED → DONE is rejected (must go through IN_REVIEW)', () => {
      expect(canTransition('BLOCKED', 'DONE')).toBe(false);
    });
  });

  describe('DONE is terminal', () => {
    it.each(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED'] as const)(
      'DONE → %s is rejected',
      to => {
        expect(canTransition('DONE', to)).toBe(false);
      },
    );
  });

  describe('self-transitions are rejected', () => {
    it.each(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const)(
      '%s → %s is rejected',
      same => {
        expect(canTransition(same, same)).toBe(false);
      },
    );
  });

  describe('allowedNextStates', () => {
    it('TODO can go to IN_PROGRESS or BLOCKED', () => {
      expect(allowedNextStates('TODO').sort()).toEqual(['BLOCKED', 'IN_PROGRESS']);
    });
    it('DONE is terminal — no allowed transitions', () => {
      expect(allowedNextStates('DONE')).toEqual([]);
    });
  });
});
