'use client'
import { useContext, useState } from 'react'
import logo from '../assets/logo.png'
import { User, Trophy, Shield, Lock, LogOut } from 'lucide-react';
import {
  Dialog,
  DialogPanel,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel,
} from '@headlessui/react'
import {
  Bars3Icon,
  InformationCircleIcon,
  EnvelopeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Moon, Sun } from "lucide-react";
import { ChevronDownIcon, PhoneIcon, PlayCircleIcon } from '@heroicons/react/20/solid'
import { Link, useNavigate } from 'react-router-dom'
import AuthContext from '../context/AuthContext'
import { ThemeContext } from "../context/ThemeContext"

const products = [
  { name: 'About Us', description: 'About us', Link: '/about-us', icon: InformationCircleIcon },
  { name: 'Contact Us', description: 'Get in contact with us', Link: '/contact-us', icon: EnvelopeIcon },
]

const getInitials = (user) => {
  const parts = [user?.emri, user?.mbiemri]
    .filter(Boolean)
    .map((part) => part.trim());

  if (parts.length > 0) {
    return parts.map((part) => part.charAt(0).toUpperCase()).join('').slice(0, 2);
  }

  if (user?.full_name) {
    return user.full_name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  return user?.email?.charAt(0).toUpperCase() || 'U';
};

const Navbar = () => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  // Tracks open/closed state for the mobile navigation drawer.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Reads current session user and logout action from auth context.
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()

  const rolePanel = user?.is_admin
    ? { label: 'Admin Panel', to: '/dashboard' }
    : user?.is_organizer
      ? { label: 'Organizer Panel', to: '/organizer/dashboard' }
      : user?.is_referee
        ? { label: 'Referee Panel', to: '/referee/dashboard' }
        : null
  const profileInitials = getInitials(user)

  // Logs out the user, closes mobile UI state, then returns to home.
  const handleLogout = async () => {
    await logout()
    setMobileMenuOpen(false)
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-white/10 shadow-lg transition-colors duration-300">
      <nav aria-label="Global" className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8">
        <div className="flex lg:flex-1">
          <Link to="/" className="-m-1.5 p-1.5 group flex items-center gap-3">
            <span className="sr-only">Your Company</span>
            <img
              alt="Tournament Logo"
              src={logo}
              className="h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-400"
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
        </div>
        <PopoverGroup className="hidden lg:flex lg:gap-x-12">
          <Popover className="relative">
            <PopoverButton className="flex items-center gap-x-1 text-sm/6 font-semibold text-gray-200 hover:text-white transition-colors duration-200 outline-none">
              More
              <ChevronDownIcon aria-hidden="true" className="size-5 flex-none text-gray-400 group-hover:text-white" />
            </PopoverButton>

            <PopoverPanel
              transition
              className="absolute left-1/2 z-10 mt-3 w-screen max-w-md -translate-x-1/2 overflow-hidden rounded-3xl bg-gray-800 outline-1 -outline-offset-1 outline-white/10 transition data-closed:translate-y-1 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in"
            >
              <div className="p-4">
                {products.map((item) => (
                  <div
                    key={item.name}
                    className="group relative flex items-center gap-x-6 rounded-lg p-4 text-sm/6 hover:bg-white/5"
                  >
                    <div className="flex size-11 flex-none items-center justify-center rounded-lg bg-gray-700/50 group-hover:bg-gray-700">
                      <item.icon aria-hidden="true" className="size-6 text-gray-400 group-hover:text-white" />
                    </div>
                    <div className="flex-auto">
                      <Link to={item.Link} className="block font-semibold text-white">
                        {item.name}
                        <span className="absolute inset-0" />
                      </Link>
                      <p className="mt-1 text-gray-400">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverPanel>
          </Popover>

          <Link to="/live-matches" className="text-sm/6 font-semibold text-gray-200 hover:text-white transition-colors duration-200">
            Live Matches
          </Link>
          <Link to="/public/standings" className="text-sm/6 font-semibold text-gray-200 hover:text-white transition-colors duration-200">
            Standings
          </Link>
          <Link to="/brackets" className="text-sm/6 font-semibold text-gray-200 hover:text-white transition-colors duration-200">
            Brackets
          </Link>
        </PopoverGroup>
        {/* Desktop auth actions vary by user role. */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {!user ? (
              <Link to="/login" className="text-sm/6 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg">
                Log in <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <Popover className="relative">
                <PopoverButton className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-white/20 outline-none cursor-pointer">
                  {profileInitials}
                </PopoverButton>

                <PopoverPanel
                  transition
                  className="absolute right-0 z-10 mt-3 w-56 origin-top-right overflow-hidden rounded-xl bg-slate-900 border border-slate-700/50 shadow-lg ring-1 ring-black ring-opacity-5 transition data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-150 data-leave:ease-in"
                >
                  <div className="py-1">
                    {/* Standard User Option */}
                    <Link
                      to="/profile"
                      className="group flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/60 hover:text-white"
                    >
                      <User className="h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-400" />
                      Profile
                    </Link>

                    {/* Organizer Option */}
                    {user?.is_organizer && (
                      <Link
                        to="/organizer/tournaments"
                        className="group flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/60 hover:text-white"
                      >
                        <Trophy className="h-4 w-4 text-slate-400 transition-colors group-hover:text-amber-400" />
                        My Tournaments
                      </Link>
                    )}

                    {/* Referee Option */}
                    {user?.is_referee && (
                      <Link
                        to="/referee/dashboard"
                        className="group flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/60 hover:text-white"
                      >
                        <Shield className="h-4 w-4 text-slate-400 transition-colors group-hover:text-purple-400" />
                        Referee Dashboard
                      </Link>
                    )}

                    {/* Admin Option */}
                    {user?.is_admin && (
                      <Link
                        to="/dashboard"
                        className="group flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/60 hover:text-white"
                      >
                        <Lock className="h-4 w-4 text-slate-400 transition-colors group-hover:text-emerald-400" />
                        Dashboard
                      </Link>
                    )}

                    {/* Divider */}
                    <div className="my-1 h-px w-full bg-slate-700/50" />

                    {/* Logout Action (Destructive) */}
                    <button
                      onClick={handleLogout}
                      className="group flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                    >
                      <LogOut className="h-4 w-4 text-red-500/70 transition-colors group-hover:text-red-400" />
                      Logout
                    </button>
                  </div>
                </PopoverPanel>
              </Popover>
            )}
          </div>
        </div>
      </nav>
      {/* Mobile navigation drawer for small screens. */}
      <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
        <div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-slate-900 p-6 sm:max-w-sm sm:ring-1 sm:ring-white/10 shadow-2xl">
          <div className="flex items-center justify-between">
            <Link to="/" className="-m-1.5 p-1.5 group flex items-center gap-3">
              <span className="sr-only">Your Company</span>
              <img
                alt="Tournament Logo"
                src={logo}
                className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="-m-2.5 rounded-md p-2.5 text-gray-400"
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-white/10">
              <div className="space-y-2 py-6">
                <Disclosure as="div" className="-mx-3">
                  <DisclosureButton className="group flex w-full items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-base/7 font-semibold text-white hover:bg-white/5">
                    Product
                    <ChevronDownIcon aria-hidden="true" className="size-5 flex-none group-data-open:rotate-180" />
                  </DisclosureButton>
                </Disclosure>
                <Link
                  to="/live-matches"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-white/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Live Matches
                </Link>
                <Link
                  to="/public/standings"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-white/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Standings
                </Link>
                <Link
                  to="/brackets"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-white/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Brackets
                </Link>
              </div>
              <div className="py-6">
                {/* Mobile auth actions also switch for guest/admin/user states. */}
                {!user ? (
                  <Link
                    to="/login"
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 font-semibold text-white hover:bg-white/5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Log in <span aria-hidden="true">→</span>
                  </Link>
                ) : (
                  <>
                    {rolePanel && (
                      <Link
                        to={rolePanel.to}
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 font-semibold text-white hover:bg-white/5"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {rolePanel.label}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 font-semibold text-white hover:bg-white/5"
                    >
                      Logout
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Toggle Dark Mode"
                >
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <Link
                  to="/profile"
                  className="-mx-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-base/7 font-semibold text-white hover:bg-white/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                    {profileInitials}
                  </span>
                  <span>Profile</span>
                </Link>
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  )
}

export default Navbar;
