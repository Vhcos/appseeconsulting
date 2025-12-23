// components/ui/Button.tsx
import Link from "next/link";
import {
  type ButtonHTMLAttributes,
  type AnchorHTMLAttributes,
} from "react";

type ButtonLinkProps =
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string; // obligatorio cuando es link
  };

type ButtonNativeProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never; // aquí NO existe href
  };

export type ButtonProps = ButtonLinkProps | ButtonNativeProps;

export default function Button(props: ButtonProps) {
  const cls =
    "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium";

  if ("href" in props) {
    // En este branch, TS sabe que props es ButtonLinkProps y href es string
    return (
      <Link className={cls} href={props.href as string}>
        {props.children}
      </Link>
    );
  }

  return (
    <button className={cls} {...props}>
      {props.children}
    </button>
  );
}
