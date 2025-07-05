{
  description = "Development environment for @akoenig/effective";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22 # Node.js 22 is the current LTS
            corepack_22 # Corepack for Node.js 22
            git
          ];

          shellHook = ''
            echo "Development environment loaded!"
            echo "Node.js version: $(node --version)"
            
            # Enable pnpm through corepack
            export COREPACK_ENABLE_STRICT=0
            corepack enable
            corepack prepare pnpm@latest --activate
            
            # Ensure pnpm is in PATH
            export PATH="$HOME/.local/share/pnpm:$PATH"
            
            echo "pnpm version: $(pnpm --version)"
          '';
        };
      });
}