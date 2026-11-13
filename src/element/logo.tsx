import { type HTMLProps, useId } from "react"

/** Pac's Arcade pixel pac (static copy of the tricolor mark, see public/pacsarcade-mark.svg). */
export default function Logo(props: HTMLProps<SVGSVGElement>) {
  const id = `pa-rainbow-${useId().replace(/:/g, "")}`
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 -2.5 140 140" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="161.88" y2="106.84" spreadMethod="repeat">
          <stop offset="0.000" stopColor="#FFE11E"/><stop offset="0.140" stopColor="#FF5A3C"/><stop offset="0.280" stopColor="#E6369A"/><stop offset="0.440" stopColor="#9B4BFF"/><stop offset="0.600" stopColor="#2E7CFF"/><stop offset="0.720" stopColor="#2FE0D6"/><stop offset="0.840" stopColor="#35E06A"/><stop offset="0.930" stopColor="#B6E52C"/><stop offset="1.000" stopColor="#FFE11E"/>
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M40 0h55v5h-55zM40 5h55v5h-55zM20 10h75v5h-75zM20 15h75v5h-75zM10 20h85v5h-85zM10 25h75v5h-75zM10 30h75v5h-75zM10 35h65v5h-65zM0 40h75v5h-75zM0 45h65v5h-65zM0 50h65v5h-65zM0 55h55v5h-55zM0 60h55v5h-55zM0 65h45v5h-45zM0 70h45v5h-45zM0 75h55v5h-55zM0 80h55v5h-55zM0 85h65v5h-65zM0 90h65v5h-65zM0 95h75v5h-75zM10 100h65v5h-65zM10 105h75v5h-75zM10 110h75v5h-75zM10 115h85v5h-85zM20 120h75v5h-75zM20 125h75v5h-75zM40 130h55v5h-55zM40 135h55v5h-55z" />
    </svg>
  )
}
