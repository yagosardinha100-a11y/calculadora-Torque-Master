import { describe, expect, it } from 'vitest'
import type {
  Appointment,
  CellOverride,
  Collaborator,
  Dobra,
  Team,
} from '@/types'
import { buildOverrideId } from '@/types'
import { getMonthDays } from '@/utils/dates'
import {
  buildScheduleLookups,
  buildScheduleMatrix,
  DEFAULT_CYCLE,
  getAvailabilityInfo,
  getBaseStatus,
  getEmbarkEndDate,
  getNextEmbarkDate,
  getRemainingFolgaAfter,
  resolveCell,
} from '@/utils/schedule'

const teamA: Team = {
  id: 'team-a',
  name: 'Turma A',
  anchorDate: '2026-07-01',
  color: 'blue',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const teamB: Team = {
  id: 'team-b',
  name: 'Turma B',
  anchorDate: '2026-07-15',
  color: 'emerald',
  createdAt: '2026-01-01T00:00:00.000Z',
}

function buildCollaborator(overrides: Partial<Collaborator> = {}): Collaborator {
  return {
    id: 'collab-1',
    name: 'João Silva',
    role: 'MECANICO',
    teamId: teamA.id,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function buildLookups({
  teams = [teamA, teamB],
  overrides = [],
  dobras = [],
  appointments = [],
}: {
  teams?: Team[]
  overrides?: CellOverride[]
  dobras?: Dobra[]
  appointments?: Appointment[]
} = {}) {
  return buildScheduleLookups(teams, overrides, dobras, appointments)
}

describe('getBaseStatus — ciclo 14x14 ancorado na turma', () => {
  it('marca os 14 primeiros dias do ciclo como ESCALA', () => {
    expect(getBaseStatus('2026-07-01', teamA, DEFAULT_CYCLE)).toBe('ESCALA')
    expect(getBaseStatus('2026-07-14', teamA, DEFAULT_CYCLE)).toBe('ESCALA')
  })

  it('marca os 14 dias seguintes como FOLGA', () => {
    expect(getBaseStatus('2026-07-15', teamA, DEFAULT_CYCLE)).toBe('FOLGA')
    expect(getBaseStatus('2026-07-28', teamA, DEFAULT_CYCLE)).toBe('FOLGA')
  })

  it('repete o ciclo indefinidamente para frente', () => {
    expect(getBaseStatus('2026-07-29', teamA, DEFAULT_CYCLE)).toBe('ESCALA')
    expect(getBaseStatus('2026-08-11', teamA, DEFAULT_CYCLE)).toBe('ESCALA')
    expect(getBaseStatus('2026-08-12', teamA, DEFAULT_CYCLE)).toBe('FOLGA')
  })

  it('repete o ciclo para trás no tempo (datas antes da âncora)', () => {
    expect(getBaseStatus('2026-06-30', teamA, DEFAULT_CYCLE)).toBe('FOLGA')
    expect(getBaseStatus('2026-06-17', teamA, DEFAULT_CYCLE)).toBe('FOLGA')
    expect(getBaseStatus('2026-06-16', teamA, DEFAULT_CYCLE)).toBe('ESCALA')
    expect(getBaseStatus('2026-06-03', teamA, DEFAULT_CYCLE)).toBe('ESCALA')
  })

  it('retorna FOLGA quando o colaborador não possui turma', () => {
    expect(getBaseStatus('2026-07-01', null, DEFAULT_CYCLE)).toBe('FOLGA')
  })
})

describe('getNextEmbarkDate / getEmbarkEndDate', () => {
  it('a partir de um dia de folga, aponta o início do próximo ciclo', () => {
    expect(getNextEmbarkDate('2026-07-20', teamA, DEFAULT_CYCLE)).toBe('2026-07-29')
  })

  it('a partir de um dia embarcado, aponta o embarque do ciclo seguinte', () => {
    expect(getNextEmbarkDate('2026-07-05', teamA, DEFAULT_CYCLE)).toBe('2026-07-29')
  })

  it('calcula o último dia do embarque corrente', () => {
    expect(getEmbarkEndDate('2026-07-01', teamA, DEFAULT_CYCLE)).toBe('2026-07-14')
    expect(getEmbarkEndDate('2026-07-14', teamA, DEFAULT_CYCLE)).toBe('2026-07-14')
  })
})

describe('getRemainingFolgaAfter — regra da dobra', () => {
  it('a dobra consome exatamente os dias de folga e o próximo embarque não muda', () => {
    // Dobra de 15/07 a 18/07: 4 dias de folga consumidos.
    const { remainingDays, nextEmbarkDate } = getRemainingFolgaAfter(
      '2026-07-18',
      teamA,
      DEFAULT_CYCLE,
    )
    expect(nextEmbarkDate).toBe('2026-07-29')
    expect(remainingDays).toBe(10) // 19/07 a 28/07
  })

  it('dobra que consome toda a folga deixa zero dias restantes', () => {
    const { remainingDays, nextEmbarkDate } = getRemainingFolgaAfter(
      '2026-07-28',
      teamA,
      DEFAULT_CYCLE,
    )
    expect(nextEmbarkDate).toBe('2026-07-29')
    expect(remainingDays).toBe(0)
  })
})

describe('resolveCell — precedência de resolução', () => {
  const collaborator = buildCollaborator()

  const dobra: Dobra = {
    id: 'dobra-1',
    collaboratorId: collaborator.id,
    startDate: '2026-07-15',
    endDate: '2026-07-18',
    reason: 'Cobertura de férias',
    observation: '',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  }

  const ferias: Appointment = {
    id: 'appt-1',
    collaboratorId: collaborator.id,
    type: 'FERIAS',
    startDate: '2026-07-16',
    endDate: '2026-07-25',
    title: '',
    notes: '',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  }

  it('sem registros, segue o ciclo base da turma', () => {
    const cell = resolveCell(collaborator, '2026-07-10', buildLookups(), DEFAULT_CYCLE)
    expect(cell.status).toBe('ESCALA')
    expect(cell.source).toBe('BASE')
  })

  it('dobra sobrepõe o ciclo base e os compromissos', () => {
    const lookups = buildLookups({ dobras: [dobra], appointments: [ferias] })
    const cell = resolveCell(collaborator, '2026-07-16', lookups, DEFAULT_CYCLE)
    expect(cell.status).toBe('DOBRA')
    expect(cell.source).toBe('DOBRA')
  })

  it('após o fim da dobra, o compromisso volta a valer', () => {
    const lookups = buildLookups({ dobras: [dobra], appointments: [ferias] })
    const cell = resolveCell(collaborator, '2026-07-19', lookups, DEFAULT_CYCLE)
    expect(cell.status).toBe('FERIAS')
    expect(cell.source).toBe('APPOINTMENT')
  })

  it('ajuste manual tem precedência máxima', () => {
    const override: CellOverride = {
      id: buildOverrideId(collaborator.id, '2026-07-16'),
      collaboratorId: collaborator.id,
      date: '2026-07-16',
      status: 'NO_SHOW',
      observation: 'Não se apresentou',
      updatedAt: '2026-07-16T00:00:00.000Z',
    }
    const lookups = buildLookups({
      overrides: [override],
      dobras: [dobra],
      appointments: [ferias],
    })
    const cell = resolveCell(collaborator, '2026-07-16', lookups, DEFAULT_CYCLE)
    expect(cell.status).toBe('NO_SHOW')
    expect(cell.source).toBe('OVERRIDE')
    expect(cell.observation).toBe('Não se apresentou')
  })

  it('compromisso do tipo OUTRO mantém o status base e anexa o compromisso', () => {
    const outro: Appointment = {
      ...ferias,
      id: 'appt-2',
      type: 'OUTRO',
      title: 'Consulta odontológica',
      startDate: '2026-07-20',
      endDate: '2026-07-20',
    }
    const lookups = buildLookups({ appointments: [outro] })
    const cell = resolveCell(collaborator, '2026-07-20', lookups, DEFAULT_CYCLE)
    expect(cell.status).toBe('FOLGA')
    expect(cell.source).toBe('BASE')
    expect(cell.appointment?.title).toBe('Consulta odontológica')
  })
})

describe('buildScheduleMatrix — POB', () => {
  it('conta apenas ESCALA e DOBRA de colaboradores ativos', () => {
    const collabA = buildCollaborator({ id: 'c-a', teamId: teamA.id })
    const collabB = buildCollaborator({ id: 'c-b', teamId: teamB.id })
    const inactive = buildCollaborator({ id: 'c-i', teamId: teamA.id, active: false })

    const days = getMonthDays(new Date(2026, 6, 1)) // julho/2026
    const matrix = buildScheduleMatrix(
      [collabA, collabB, inactive],
      days,
      buildLookups(),
      DEFAULT_CYCLE,
    )

    // Turmas A e B alternadas: exatamente 1 pessoa a bordo todos os dias.
    expect(matrix.pob).toHaveLength(31)
    expect(matrix.pob.every((count) => count === 1)).toBe(true)
  })

  it('dobra aumenta o POB nos dias correspondentes', () => {
    const collabA = buildCollaborator({ id: 'c-a', teamId: teamA.id })
    const collabB = buildCollaborator({ id: 'c-b', teamId: teamB.id })
    const dobra: Dobra = {
      id: 'dobra-1',
      collaboratorId: collabA.id,
      startDate: '2026-07-15',
      endDate: '2026-07-16',
      reason: 'Falta de rendição',
      observation: '',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    }

    const days = getMonthDays(new Date(2026, 6, 1))
    const matrix = buildScheduleMatrix(
      [collabA, collabB],
      days,
      buildLookups({ dobras: [dobra] }),
      DEFAULT_CYCLE,
    )

    expect(matrix.pob[13]).toBe(1) // 14/07: apenas turma A
    expect(matrix.pob[14]).toBe(2) // 15/07: turma B embarca + dobra da turma A
    expect(matrix.pob[15]).toBe(2) // 16/07: idem
    expect(matrix.pob[16]).toBe(1) // 17/07: fim da dobra
  })

  it('No Show remove a pessoa do POB do dia', () => {
    const collabA = buildCollaborator({ id: 'c-a', teamId: teamA.id })
    const override: CellOverride = {
      id: buildOverrideId(collabA.id, '2026-07-01'),
      collaboratorId: collabA.id,
      date: '2026-07-01',
      status: 'NO_SHOW',
      observation: '',
      updatedAt: '2026-07-01T00:00:00.000Z',
    }

    const days = getMonthDays(new Date(2026, 6, 1))
    const matrix = buildScheduleMatrix(
      [collabA],
      days,
      buildLookups({ overrides: [override] }),
      DEFAULT_CYCLE,
    )

    expect(matrix.pob[0]).toBe(0) // 01/07: no show
    expect(matrix.pob[1]).toBe(1) // 02/07: embarcado normalmente
  })
})

describe('getAvailabilityInfo — disponibilidade automática', () => {
  it('identifica colaborador embarcado', () => {
    const collaborator = buildCollaborator()
    const info = getAvailabilityInfo(collaborator, '2026-07-05', buildLookups(), DEFAULT_CYCLE)
    expect(info.state).toBe('EMBARCADO')
    expect(info.nextEmbarkDate).toBe('2026-07-29')
  })

  it('identifica colaborador disponível na folga', () => {
    const collaborator = buildCollaborator()
    const info = getAvailabilityInfo(collaborator, '2026-07-20', buildLookups(), DEFAULT_CYCLE)
    expect(info.state).toBe('DISPONIVEL')
    expect(info.nextEmbarkDate).toBe('2026-07-29')
  })

  it('identifica compromisso durante a folga (treinamento)', () => {
    const collaborator = buildCollaborator()
    const treinamento: Appointment = {
      id: 'appt-1',
      collaboratorId: collaborator.id,
      type: 'TREINAMENTO',
      startDate: '2026-07-20',
      endDate: '2026-07-22',
      title: '',
      notes: '',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    }
    const info = getAvailabilityInfo(
      collaborator,
      '2026-07-21',
      buildLookups({ appointments: [treinamento] }),
      DEFAULT_CYCLE,
    )
    expect(info.state).toBe('COMPROMISSO')
    expect(info.upcomingAppointments).toHaveLength(1)
  })

  it('identifica colaborador inativo', () => {
    const collaborator = buildCollaborator({ active: false })
    const info = getAvailabilityInfo(collaborator, '2026-07-20', buildLookups(), DEFAULT_CYCLE)
    expect(info.state).toBe('INATIVO')
  })
})
