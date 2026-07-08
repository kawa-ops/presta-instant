'use client'
import { useEffect, useState, useCallback } from 'react'

// Lightweight app-wide i18n: FR default, EN, ES.
// Coverage: navigation, dashboards, statuses, common actions.
// Remaining deep-page strings (tables/forms) stay FR until the dedicated pass.

export type Lang = 'fr' | 'en' | 'es'

const DICT: Record<Lang, Record<string, string>> = {
  fr: {
    // Nav
    nav_dashboard: 'Dashboard', nav_week: 'Ma semaine', nav_prods: 'Post-productions',
    nav_contractors: 'Prestataires', nav_archives: 'Archives', nav_billing: 'Facturation',
    nav_settings: 'Paramètres', nav_tasks: 'Mes prestations', nav_profile: 'Mon profil',
    logout: 'Déconnexion', admin_role: 'Administrateur', contractor_role: 'Prestataire',
    contractor_space: 'espace prestataire', postprod: 'post-production',
    // Dashboard
    hello: 'Bonjour', brief: '✨ Brief du jour', level: 'Niveau', week_goal: '🎯 Objectif de la semaine',
    objectives: '🎯 Objectifs du moment', all_done: ' — tout est accompli ! 🏆',
    done_today: "terminés aujourd'hui", xp_week: 'XP cette semaine', streak: "streak d'activité",
    kpi_inprogress: 'Projets en cours', kpi_overdue: 'En retard', kpi_today: "À rendre aujourd'hui",
    kpi_month: 'Terminés ce mois', kpi_waiting: 'En attente de validation', kpi_validated: 'Projets validés',
    summary: 'Résumé', priorities: 'Priorités du jour', see_all: 'Tout voir →', no_urgent: "✓ Aucune urgence aujourd'hui",
    leaderboard: '🏆 Classement du studio', achievements: '🏅 Succès', to_process: '🔔 À traiter',
    health: '📊 Santé de la production', healthy: '✓ Production parfaitement saine',
    prods_done: 'productions terminées', xp_today: "XP aujourd'hui", active_prods: 'prestations actives',
    my_tasks: 'Mes prestations', notifications: 'Notifications',
    obj_no_overdue: 'Aucun projet en retard', obj_deliver_today: 'Livrer les projets du jour',
    obj_validate: 'Valider les livraisons prestataires', obj_feedback: 'Traiter les retours clients',
    pending_amount: 'Montant en attente', validated_amount: 'Montant validé', total_balance: 'Solde total',
    this_month: 'ce mois-ci', since_start: 'gagné depuis le début', delivered_waiting: 'livré, en attente de validation',
  },
  en: {
    nav_dashboard: 'Dashboard', nav_week: 'My week', nav_prods: 'Post-production',
    nav_contractors: 'Contractors', nav_archives: 'Archives', nav_billing: 'Billing',
    nav_settings: 'Settings', nav_tasks: 'My projects', nav_profile: 'My profile',
    logout: 'Log out', admin_role: 'Administrator', contractor_role: 'Contractor',
    contractor_space: 'contractor space', postprod: 'post-production',
    hello: 'Hello', brief: '✨ Daily brief', level: 'Level', week_goal: '🎯 Weekly goal',
    objectives: '🎯 Current objectives', all_done: ' — all done! 🏆',
    done_today: 'completed today', xp_week: 'XP this week', streak: 'activity streak',
    kpi_inprogress: 'Projects in progress', kpi_overdue: 'Overdue', kpi_today: 'Due today',
    kpi_month: 'Completed this month', kpi_waiting: 'Waiting for validation', kpi_validated: 'Validated projects',
    summary: 'Summary', priorities: "Today's priorities", see_all: 'See all →', no_urgent: '✓ Nothing urgent today',
    leaderboard: '🏆 Studio ranking', achievements: '🏅 Achievements', to_process: '🔔 To process',
    health: '📊 Production health', healthy: '✓ Production perfectly healthy',
    prods_done: 'completed productions', xp_today: 'XP today', active_prods: 'active projects',
    my_tasks: 'My projects', notifications: 'Notifications',
    obj_no_overdue: 'No overdue projects', obj_deliver_today: "Deliver today's projects",
    obj_validate: 'Validate contractor deliveries', obj_feedback: 'Process client feedback',
    pending_amount: 'Pending amount', validated_amount: 'Validated amount', total_balance: 'Total balance',
    this_month: 'this month', since_start: 'earned since the start', delivered_waiting: 'delivered, awaiting validation',
  },
  es: {
    nav_dashboard: 'Panel', nav_week: 'Mi semana', nav_prods: 'Postproducción',
    nav_contractors: 'Colaboradores', nav_archives: 'Archivos', nav_billing: 'Facturación',
    nav_settings: 'Ajustes', nav_tasks: 'Mis proyectos', nav_profile: 'Mi perfil',
    logout: 'Cerrar sesión', admin_role: 'Administrador', contractor_role: 'Colaborador',
    contractor_space: 'espacio colaborador', postprod: 'postproducción',
    hello: 'Hola', brief: '✨ Resumen del día', level: 'Nivel', week_goal: '🎯 Objetivo semanal',
    objectives: '🎯 Objetivos actuales', all_done: ' — ¡todo listo! 🏆',
    done_today: 'terminados hoy', xp_week: 'XP esta semana', streak: 'racha de actividad',
    kpi_inprogress: 'Proyectos en curso', kpi_overdue: 'Atrasados', kpi_today: 'Para hoy',
    kpi_month: 'Terminados este mes', kpi_waiting: 'Esperando validación', kpi_validated: 'Proyectos validados',
    summary: 'Resumen', priorities: 'Prioridades del día', see_all: 'Ver todo →', no_urgent: '✓ Nada urgente hoy',
    leaderboard: '🏆 Ranking del estudio', achievements: '🏅 Logros', to_process: '🔔 Por tratar',
    health: '📊 Salud de la producción', healthy: '✓ Producción perfectamente sana',
    prods_done: 'producciones terminadas', xp_today: 'XP hoy', active_prods: 'proyectos activos',
    my_tasks: 'Mis proyectos', notifications: 'Notificaciones',
    obj_no_overdue: 'Ningún proyecto atrasado', obj_deliver_today: 'Entregar los proyectos de hoy',
    obj_validate: 'Validar las entregas', obj_feedback: 'Tratar los comentarios de clientes',
    pending_amount: 'Importe pendiente', validated_amount: 'Importe validado', total_balance: 'Saldo total',
    this_month: 'este mes', since_start: 'ganado desde el inicio', delivered_waiting: 'entregado, esperando validación',
  },
}

export function useLang(): [Lang, (l: Lang) => void, (k: string) => string] {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    const saved = localStorage.getItem('app-lang') as Lang | null
    if (saved && DICT[saved]) setLangState(saved)
    const onChange = (e: any) => setLangState(e.detail)
    window.addEventListener('lang-change', onChange)
    return () => window.removeEventListener('lang-change', onChange)
  }, [])

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem('app-lang', l)
    window.dispatchEvent(new CustomEvent('lang-change', { detail: l }))
  }, [])

  const t = useCallback((k: string) => DICT[lang][k] || DICT.fr[k] || k, [lang])
  return [lang, setLang, t]
}

export function LangSwitcher() {
  const [lang, setLang] = useLang()
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {(['fr', 'en', 'es'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)} style={{
          background: lang === l ? 'rgba(167,139,250,0.2)' : 'transparent',
          border: `1px solid ${lang === l ? 'rgba(167,139,250,0.5)' : 'rgba(167,139,250,0.12)'}`,
          borderRadius: 7, padding: '2px 6px', cursor: 'pointer', fontSize: '0.8rem',
          opacity: lang === l ? 1 : 0.5, transition: 'all 0.15s',
        }}>{l === 'fr' ? '🇫🇷' : l === 'en' ? '🇬🇧' : '🇪🇸'}</button>
      ))}
    </div>
  )
}
