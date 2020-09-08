/* eslint-disable */
import React, {
    useContext,
    useEffect,
    useState,
} from 'react';

import createAuth0Client from '@auth0/auth0-spa-js';
import Auth0Client from '@auth0/auth0-spa-js/dist/typings/Auth0Client';

interface Auth0Props {
    children: React.ReactElement;
    customer: string;
    onRedirectCallback: (_) => void;
}

const DEFAULT_REDIRECT_CALLBACK = _ => window.history.replaceState({}, document.title, window.location.pathname);

export const Auth0Context = React.createContext(null);
export const useAuth0 = () => useContext(Auth0Context);
export const useUpdateMetadata = (
    apiUrl: string,
    accessToken: string,
    onMetadataChange: (m: any) => void,
    user: any,
    userMetadata: any,
) => (updatedMetadata: any) => {
    const newMetadata = {
        ...userMetadata,
        ...updatedMetadata,
    };
    const body = {
        user_metadata: newMetadata,
    };

    fetch(`${apiUrl}users/${user.sub}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify(body),
    }).then(() => onMetadataChange(newMetadata));
};

export const Auth0Provider = ({
    children,
    customer,
    onRedirectCallback = DEFAULT_REDIRECT_CALLBACK,
    ...initOptions
}: Auth0Props & Auth0ClientOptions) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>();
    const [user, setUser] = useState();
    const [auth0Client, setAuth0] = useState<Auth0Client>(null);
    const [loading, setLoading] = useState(true);
    const [popupOpen, setPopupOpen] = useState(false);

    useEffect(() => {
        const initAuth0 = async () => {
            const auth0FromHook = await createAuth0Client(initOptions);
            setAuth0(auth0FromHook);

            if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
                const { appState } = await auth0FromHook.handleRedirectCallback();
                onRedirectCallback(appState);
            }

            const isAuthenticated = await auth0FromHook.isAuthenticated();

            setIsAuthenticated(isAuthenticated);

            if (isAuthenticated) {
                const user = await auth0FromHook.getUser();
                setUser(user);
            }

            setLoading(false);
        };
        initAuth0();
    }, []);

    const loginWithPopup = async (params = {}) => {
        setPopupOpen(true);
        try {
            await auth0Client.loginWithPopup(params);
        } catch (error) {
            console.error(error);
        } finally {
            setPopupOpen(false);
        }
        const user = await auth0Client.getUser();
        setUser(user);
        setIsAuthenticated(true);
    };

    const handleRedirectCallback = async () => {
        setLoading(true);
        await auth0Client.handleRedirectCallback();
        const user = await auth0Client.getUser();
        setLoading(false);
        setIsAuthenticated(true);
        setUser(user);
    };

    return (
        <Auth0Context.Provider
            value={{
                isAuthenticated,
                user,
                loading,
                popupOpen,
                loginWithPopup,
                handleRedirectCallback,
                customer,
                getIdTokenClaims: (...p) => auth0Client.getIdTokenClaims(...p),
                loginWithRedirect: (...p) => auth0Client.loginWithRedirect(...p),
                getTokenSilently: (...p) => auth0Client.getTokenSilently(...p),
                getTokenWithPopup: (...p) => auth0Client.getTokenWithPopup(...p),
                logout: (...p) => auth0Client.logout(...p),
            }}
        >
            {children}
        </Auth0Context.Provider>
    );
};
