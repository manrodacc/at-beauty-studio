import { ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, UserRound } from 'lucide-react'
import { motion } from 'motion/react'
import { DropdownMenu } from 'radix-ui'
import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { homeFor, navigation } from '@/app/nav'
import { NotificationBell } from '@/features/notificaciones'
import { salir, useAuth } from '@/providers/AuthProvider'
import { Button, Modal, Skeleton } from '@/components/ui'
import { Logo } from './Logo'

export default function AppShell() {
  const { profile } = useAuth()
  const role = profile!.rol
  const isClient = role === 'cliente'
  const location = useLocation()
  const [menu, setMenu] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const links = navigation[role]

  const nav = (close?: () => void) => links.map(({ path, label, icon: Icon }) =>
    <NavLink key={path} to={path} onClick={close} title={label}><Icon size={20} aria-hidden/><span>{label}</span></NavLink>,
  )

  return <div className={'workspace-shell' + (isClient ? ' client-shell' : '') + (collapsed ? ' sidebar-collapsed' : '')}>
    <a href="#panel-main" className="skip-link">Saltar al contenido</a>
    <aside className="workspace-sidebar"><Logo to={homeFor(role)}/><nav aria-label="Menú del panel">{nav()}</nav>
      {!isClient && <Button variant="ghost" className="collapse-sidebar" aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={20}/> : <><PanelLeftClose size={20}/> Colapsar</>}</Button>}
    </aside>
    <div className="workspace-body">
      <header className="workspace-header"><div className="workspace-header-brand">
        {!isClient && <Button className="icon-button workspace-menu" variant="ghost" aria-label="Abrir menú" onClick={() => setMenu(true)}><Menu size={22}/></Button>}
        <div className="workspace-mobile-logo"><Logo to={homeFor(role)}/></div><span className="workspace-role">{{ admin: 'Administración', colaboradora: 'Colaboradora', cliente: 'Mi cuenta' }[role]}</span>
      </div>
      <div className="workspace-controls"><NotificationBell/>
        <DropdownMenu.Root><DropdownMenu.Trigger asChild><Button variant="ghost" className="user-button" aria-label="Menú de cuenta"><span className="user-avatar">{profile?.nombres?.trim().charAt(0).toUpperCase() || <UserRound size={17}/>}</span><span>{profile?.nombres}</span><ChevronDown size={15}/></Button></DropdownMenu.Trigger>
          <DropdownMenu.Portal><DropdownMenu.Content className="account-menu" sideOffset={8} align="end">
            {isClient && <DropdownMenu.Item asChild><Link to="/app/historial"><UserRound size={17}/> Mi historial</Link></DropdownMenu.Item>}
            {isClient && <DropdownMenu.Item asChild><Link to="/app/perfil"><UserRound size={17}/> Mi perfil</Link></DropdownMenu.Item>}
            <DropdownMenu.Item asChild><Link to="/">Ver página pública</Link></DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => void salir()}><LogOut size={17}/> Cerrar sesión</DropdownMenu.Item>
          </DropdownMenu.Content></DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div></header>
      <main id="panel-main" className="workspace-content"><Suspense fallback={<Skeleton/>}>
        <motion.div key={location.pathname} className="workspace-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.17 }}><Outlet/></motion.div>
      </Suspense></main>
    </div>
    {isClient && <nav className="client-tabs" aria-label="Pestañas de mi cuenta">{navigation.cliente.filter(item => item.mobile).map(({ path, label, icon: Icon }) => <NavLink to={path} key={path}>{({ isActive }) => <>{isActive && <motion.span className="tab-pill" layoutId="active-tab"/>}<Icon size={21}/><span>{label}</span></>}</NavLink>)}</nav>}
    <Modal title="Menú del panel" open={menu} onOpenChange={setMenu}><nav className="drawer-navigation">{nav(() => setMenu(false))}</nav></Modal>
  </div>
}
