import React, { useState, ButtonHTMLAttributes } from "react";

interface CopyButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  buttonText: string;
  valueToCopy: string;
  icon?: React.ReactNode;
}

export default function CopyButton(props: CopyButtonProps) {
  const { buttonText, valueToCopy, icon, ...restProps } = props;
  const [buttonTextShow, setButtonTextShow] = useState(buttonText);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(valueToCopy);
      setButtonTextShow("Copiado!");
      setTimeout(() => {
        setButtonTextShow(buttonText);
      }, 1000);
    } catch (err: unknown) {
      setButtonTextShow("Erro ao Copiar");
      setTimeout(() => {
        setButtonTextShow(buttonText);
      }, 1000);
    }
  }

  return (
    <button {...restProps} onClick={handleCopy}>
      {icon}
      <span>{buttonTextShow}</span>
    </button>
  );
}
