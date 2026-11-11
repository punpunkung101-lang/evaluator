#include <winsock2.h>
#include <ws2tcpip.h>
#include <bcrypt.h>
#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <string>
#include "server.hpp"

void client(SOCKET sock,sqlite3*db){
 DWORD timeout=3000;
 setsockopt(sock,SOL_SOCKET,SO_RCVTIMEO,(const char*)&timeout,sizeof timeout);
 setsockopt(sock,SOL_SOCKET,SO_SNDTIMEO,(const char*)&timeout,sizeof timeout);
 std::string req;char buf[8192];int n;size_t headerEnd=std::string::npos,contentLength=0;bool complete=false;
 while((n=recv(sock,buf,sizeof buf,0))>0){
  req.append(buf,n);
  if(headerEnd==std::string::npos){
   headerEnd=req.find("\r\n\r\n");
   if(headerEnd!=std::string::npos){
    std::string headers=req.substr(0,headerEnd),lowerHeaders=headers;
    std::transform(lowerHeaders.begin(),lowerHeaders.end(),lowerHeaders.begin(),[](unsigned char c){return (char)std::tolower(c);});
    size_t h=lowerHeaders.find("content-length:");
    if(h!=std::string::npos)contentLength=std::strtoul(lowerHeaders.c_str()+h+15,nullptr,10);
   }
  }
  if(headerEnd!=std::string::npos&&req.size()>=headerEnd+4+contentLength){complete=true;break;}
 }
 if(!complete){std::cerr<<"Incomplete HTTP request; closing stalled connection\n";closesocket(sock);return;}
 std::istringstream first(req.substr(0,req.find("\r\n")));std::string method,path,version;first>>method>>path>>version;
 std::string body=req.substr(headerEnd+4,contentLength),token,headers=req.substr(0,headerEnd),lowerHeaders=headers;
 std::transform(lowerHeaders.begin(),lowerHeaders.end(),lowerHeaders.begin(),[](unsigned char c){return (char)std::tolower(c);});
 size_t a=lowerHeaders.find("authorization:");
 if(a!=std::string::npos){size_t v=a+15;while(v<headers.size()&&headers[v]==' ')++v;if(lowerHeaders.compare(v,7,"bearer ")==0){size_t e=headers.find("\r\n",v);token=headers.substr(v+7,e==std::string::npos?e:e-v-7);}}
 int status=200;std::string out=handle(db,method,path,body,token,status);
 std::string label=status==200?"OK":status==201?"Created":status==400?"Bad Request":status==401?"Unauthorized":status==403?"Forbidden":status==404?"Not Found":status==409?"Conflict":"Internal Server Error";
 std::string resp;
 if(method=="OPTIONS")resp="HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, Authorization\r\nConnection: close\r\nContent-Length: 0\r\n\r\n";
 else resp="HTTP/1.1 "+std::to_string(status)+" "+label+"\r\nContent-Type: application/json; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, Authorization\r\nConnection: close\r\nContent-Length: "+std::to_string(out.size())+"\r\n\r\n"+out;
 size_t sent=0;while(sent<resp.size()){int count=send(sock,resp.data()+sent,(int)(resp.size()-sent),0);if(count<=0)break;sent+=(size_t)count;}
 closesocket(sock);
}int main(int argc,char**argv){int port=argc>1?std::atoi(argv[1]):8080;sqlite3*db=nullptr;if(sqlite3_open("database/evaluator.db",&db)!=SQLITE_OK){std::cerr<<"Cannot open database/evaluator.db\n";return 1;}if(!initialize(db))return 1;WSADATA w;if(WSAStartup(MAKEWORD(2,2),&w)){std::cerr<<"Winsock startup failed\n";return 1;}SOCKET server=socket(AF_INET,SOCK_STREAM,IPPROTO_TCP);sockaddr_in addr{};addr.sin_family=AF_INET;addr.sin_addr.s_addr=htonl(INADDR_ANY);addr.sin_port=htons((u_short)port);int yes=1;setsockopt(server,SOL_SOCKET,SO_REUSEADDR,(char*)&yes,sizeof yes);if(bind(server,(sockaddr*)&addr,sizeof addr)==SOCKET_ERROR||listen(server,SOMAXCONN)==SOCKET_ERROR){std::cerr<<"Cannot listen on port "<<port<<"\n";return 1;}std::cout<<"Evaluator C++ API listening on http://localhost:"<<port<<"\nDatabase: database/evaluator.db\n";for(;;){SOCKET s=accept(server,nullptr,nullptr);if(s!=INVALID_SOCKET)client(s,db);}sqlite3_close(db);WSACleanup();return 0;}
