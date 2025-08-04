
import { User, UserRole, Melding, MeldingStatus, Project, ProjectStatus, Urenregistratie, Taak, Notificatie } from '../types';
import { add } from 'date-fns';
import sub from 'date-fns/sub';

export const MOCK_WIJKEN = ['Atol', 'Boswijk', 'Jol', 'Waterwijk', 'Zuiderzeewijk'];

export const MOCK_USERS: User[] = [
  { id: 'user-1', name: 'Admin Ali', email: 'ali@buurt.app', role: UserRole.Beheerder, avatarUrl: 'https://i.pravatar.cc/150?u=user-1', phone: '0610000001' },
  { id: 'user-2', name: 'Conciërge Carla', email: 'carla@buurt.app', role: UserRole.Concierge, avatarUrl: 'https://i.pravatar.cc/150?u=user-2', phone: '0610000002' },
  { id: 'user-3', name: 'Conciërge Chris', email: 'chris@buurt.app', role: UserRole.Concierge, avatarUrl: 'https://i.pravatar.cc/150?u=user-3', phone: '0610000003' },
  { id: 'user-4', name: 'Viewer Vera', email: 'vera@buurt.app', role: UserRole.Viewer, avatarUrl: 'https://i.pravatar.cc/150?u=user-4', phone: '0610000004' },
];

export const MOCK_MELDINGEN: Melding[] = [
  {
    id: 'melding-1',
    titel: 'Kapotte straatlantaarn',
    omschrijving: 'Lantaarnpaal #334 op de hoek van de Vleutenseweg en de Jan van Scorelstraat is defect.',
    status: MeldingStatus.InBehandeling,
    attachments: ['https://picsum.photos/seed/melding1/800/600'],
    locatie: { lat: 52.0938, lon: 5.1083 },
    timestamp: sub(new Date(), { days: 2 }),
    gebruikerId: 'user-2',
    wijk: 'Lombok',
    categorie: 'Straatmeubilair',
    updates: [],
  },
  {
    id: 'melding-2',
    titel: 'Overvolle afvalcontainer',
    omschrijving: 'De ondergrondse container bij de supermarkt is al dagen vol.',
    status: MeldingStatus.FixiMeldingGemaakt,
    attachments: ['https://picsum.photos/seed/melding2/800/600'],
    locatie: { lat: 52.0908, lon: 5.1063 },
    timestamp: sub(new Date(), { days: 5 }),
    gebruikerId: 'user-3',
    wijk: 'Lombok',
    categorie: 'Afval',
    updates: [
        { id: 'update-1', userId: 'user-1', timestamp: sub(new Date(), { days: 4 }), text: 'Fixi melding aangemaakt met nummer #12345.', attachments: [] },
    ],
  },
  {
    id: 'melding-3',
    titel: 'Losliggende stoeptegel',
    omschrijving: 'Gevaarlijke situatie voor de school, kinderen kunnen struikelen.',
    status: MeldingStatus.InBehandeling,
    attachments: ['https://picsum.photos/seed/melding3/800/600'],
    locatie: { lat: 52.0921, lon: 5.1111 },
    timestamp: sub(new Date(), { days: 1 }),
    gebruikerId: 'user-2',
    wijk: 'Oog in Al',
    categorie: 'Wegdek',
    updates: [],
  },
  {
    id: 'melding-4',
    titel: 'Groenonderhoud nodig',
    omschrijving: 'De struiken in het park groeien over het fietspad heen.',
    status: MeldingStatus.Afgerond,
    attachments: ['https://picsum.photos/seed/melding4/800/600'],
    locatie: { lat: 52.0854, lon: 5.0998 },
    timestamp: sub(new Date(), { days: 10 }),
    gebruikerId: 'user-3',
    wijk: 'Parkwijk',
    categorie: 'Groenvoorziening',
    updates: [],
    afgerondTimestamp: sub(new Date(), { days: 8 }),
  },
   {
    id: 'melding-5',
    titel: 'Graffiti op speeltoestel',
    omschrijving: 'Speeltuin in het Griftpark is beklad.',
    status: MeldingStatus.FixiMeldingGemaakt,
    attachments: ['https://picsum.photos/seed/melding5/800/600'],
    locatie: { lat: 52.0972, lon: 5.1235 },
    timestamp: sub(new Date(), { days: 4 }),
    gebruikerId: 'user-2',
    wijk: 'Wittevrouwen',
    categorie: 'Vandalisme',
    updates: [],
  },
  {
    id: 'melding-6',
    titel: 'Zwerfafval naast bankje',
    omschrijving: 'Veel zwerfafval in het Julianapark.',
    status: MeldingStatus.Afgerond,
    attachments: ['https://picsum.photos/seed/melding6/800/600'],
    locatie: { lat: 52.1084, lon: 5.0971 },
    timestamp: sub(new Date(), { days: 20 }),
    gebruikerId: 'user-2',
    wijk: 'Zuilen',
    categorie: 'Afval',
    updates: [],
    afgerondTimestamp: sub(new Date(), { days: 15 }),
  },
];

export const MOCK_PROJECTEN: Project[] = [
  {
    id: 'project-1',
    title: 'Buurttuin "De Groene Vingers"',
    description: 'Samen een braakliggend stukje grond omtoveren tot een bloeiende buurttuin voor en door de wijk.',
    creatorId: 'user-1',
    participantIds: ['user-1', 'user-2', 'user-3'],
    status: ProjectStatus.Lopend,
    startDate: sub(new Date(), { days: 20 }),
    endDate: add(new Date(), { days: 30 }),
    attachments: ['https://picsum.photos/seed/project1_att/800/600'],
    imageUrl: 'https://picsum.photos/seed/project1/800/400',
    contributions: [
      { id: 'contrib-1', userId: 'user-2', timestamp: sub(new Date(), { days: 7 }), text: 'De eerste plantjes zijn gepoot!', attachments: ['https://picsum.photos/seed/contrib1/400/300'] },
      { id: 'contrib-2', userId: 'user-3', timestamp: sub(new Date(), { days: 3 }), text: 'Heb een compostbak gebouwd.', attachments: [] },
    ],
  },
  {
    id: 'project-2',
    title: 'Opknapbeurt Speeltuin',
    description: 'De speeltuin in het park kan wel een likje verf en wat nieuwe toestellen gebruiken. Wie helpt mee?',
    creatorId: 'user-1',
    participantIds: ['user-1'],
    status: ProjectStatus.Lopend,
    startDate: new Date(),
    attachments: [],
    imageUrl: 'https://picsum.photos/seed/project2/800/400',
    contributions: [],
  },
  {
    id: 'project-3',
    title: 'Muursschildering stationstunnel',
    description: 'De saaie grijze tunnel onder het station is omgetoverd tot een kleurrijk kunstwerk.',
    creatorId: 'user-2',
    participantIds: ['user-2', 'user-3'],
    status: ProjectStatus.Afgerond,
    startDate: sub(new Date(), { days: 45 }),
    endDate: sub(new Date(), { days: 25 }),
    attachments: ['https://picsum.photos/seed/project3_att/800/600'],
    imageUrl: 'https://picsum.photos/seed/project3/800/400',
    contributions: [
        { id: 'contrib-3', userId: 'user-3', timestamp: sub(new Date(), { days: 30 }), text: 'Project succesvol afgerond!', attachments: ['https://picsum.photos/seed/contrib3/400/300'] },
    ],
  },
];

export const MOCK_UREN: Urenregistratie[] = [
    { id: 'uren-1', gebruikerId: 'user-2', starttijd: sub(sub(new Date(), { days: 1 }), { hours: 4 }), eindtijd: sub(new Date(), { days: 1 }), activiteit: 'Wijkronde', details: 'Lombok' },
    { id: 'uren-2', gebruikerId: 'user-2', starttijd: sub(sub(new Date(), { days: 2 }), { hours: 2 }), eindtijd: sub(new Date(), { days: 2 }), activiteit: 'Project', details: 'Buurttuin "De Groene Vingers"' },
    { id: 'uren-3', gebruikerId: 'user-3', starttijd: sub(sub(new Date(), { hours: 5 }), { hours: 5 }), eindtijd: sub(new Date(), { days: 1 }), activiteit: 'Wijkronde', details: 'Oog in Al' },
];

export const MOCK_TAKEN: Taak[] = [
    { id: 'taak-1', title: 'Teamoverleg', start: add(new Date(), { hours: 2 }), end: add(new Date(), { hours: 3 }), userId: 'user-2' },
    { id: 'taak-2', title: 'Wijkronde Lombok', start: new Date(), end: add(new Date(), { hours: 2 }), userId: 'user-2' },
    { id: 'taak-3', title: 'Wijkronde Parkwijk', start: new Date(), end: add(new Date(), { hours: 2 }), userId: 'user-3' },
    { id: 'taak-4', title: 'Materiaal bestellen Buurttuin', start: add(new Date(), { days: 1 }), end: add(new Date(), { days: 1, hours: 1 }), userId: 'user-1' },
];


export const MOCK_NOTIFICATIES: Notificatie[] = [
    { id: 'not-1', userId: 'user-2', message: 'Nieuwe bijdrage aan project "Buurttuin"', link: '/projects', isRead: false, timestamp: sub(new Date(), { days: 3 }), targetId: 'project-1', targetType: 'project' },
    { id: 'not-2', userId: 'user-1', message: 'Update voor melding "Losliggende stoeptegel"', link: '/issues', isRead: true, timestamp: sub(new Date(), { days: 1 }), targetId: 'melding-3', targetType: 'melding'},
    { id: 'not-3', userId: 'user-2', message: 'Je bent toegevoegd aan project "Muursschildering stationstunnel"', link: '/projects', isRead: true, timestamp: sub(new Date(), { days: 5 }), targetId: 'project-3', targetType: 'project'},
    // New unread notifications for demo
    { id: 'not-4', userId: 'user-1', message: 'Nieuw project "Opknapbeurt Speeltuin" is gestart', link: '/projects', isRead: false, timestamp: new Date(), targetId: 'project-2', targetType: 'project' },
    { id: 'not-5', userId: 'user-2', message: 'Nieuw project "Opknapbeurt Speeltuin" is gestart', link: '/projects', isRead: false, timestamp: new Date(), targetId: 'project-2', targetType: 'project' },
    { id: 'not-6', userId: 'user-1', message: 'Nieuwe melding "Graffiti op speeltoestel"', link: '/issues', isRead: false, timestamp: new Date(), targetId: 'melding-5', targetType: 'melding' },
];
