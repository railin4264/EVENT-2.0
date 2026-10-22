import type { Tribe } from '../services/tribesService';

export function tribeAccess(tribe: Tribe | null | undefined, userId?: string) {
  const member = tribe?.members?.find(item => {
    const value = item.user as string | { _id?: string; id?: string };
    return String(typeof value === 'object' ? value?._id || value?.id : value) === userId;
  });
  const isBanned = tribe?.isBanned === true || tribe?.joinRequestStatus === 'banned' || member?.status === 'banned';
  const isMember = !isBanned && tribe?.isMember === true && (!member || member.status === 'active');
  const isPrivate = Boolean(tribe?.isPrivate || tribe?.privacy === 'private' || tribe?.privacy === 'secret' ||
    tribe?.settings?.privacy === 'private' || tribe?.settings?.privacy === 'secret');
  const invitationOnly = tribe?.settings?.membership === 'invite_only' || tribe?.privacy === 'secret' || tribe?.settings?.privacy === 'secret';
  const pending = !isBanned && !isMember && Boolean(tribe?.hasPendingRequest || tribe?.joinRequestStatus === 'pending');
  const available = Boolean(tribe) && tribe?.isActive !== false && !isBanned && !isMember && !pending;
  const canJoin = available && (tribe?.canJoin ?? (!isPrivate && !invitationOnly && tribe?.settings?.membership !== 'approval_required'));
  const canRequestJoin = available && (tribe?.canRequestJoin ?? (!invitationOnly && (isPrivate || tribe?.settings?.membership === 'approval_required')));
  const canViewContent = !isBanned && (!isPrivate || !member || member.status === 'active') && Boolean(tribe && (tribe.canViewContent ?? (!isPrivate || isMember)));
  const canManageRequests = isMember && tribe?.canManageRequests === true && ['admin', 'moderator'].includes(tribe.userRole || '');
  const isAdmin = isMember && tribe?.userRole === 'admin';
  const action = isBanned ? 'blocked' : isMember ? 'leave' : pending ? 'cancel' : canJoin ? 'join' : canRequestJoin ? 'request' : invitationOnly ? 'invitation' : 'unavailable';
  const actionLabel = { blocked: 'Acceso bloqueado', leave: 'Salir', cancel: 'Cancelar solicitud', join: 'Unirse', request: 'Solicitar unirse', invitation: 'Solo por invitación', unavailable: 'No disponible' }[action];
  return { isPrivate, isMember, isBanned, pending, canJoin, canRequestJoin, canViewContent, canManageRequests, isAdmin, action, actionLabel };
}
